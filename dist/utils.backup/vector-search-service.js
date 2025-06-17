import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { logger, performanceLogger } from "./logger.js";
/**
 * 🔍 Vector-basierte Produktsuche mit semantischer Ähnlichkeit
 * Lazy-Init Pattern: VectorStore wird nur bei Bedarf erstellt
 */
export class VectorSearchService {
    vectorStore = null;
    isInitialized = false;
    initializationPromise = null;
    embeddings;
    // 🎛️ Konfiguration
    config = {
        enabled: process.env.USE_VECTOR_SEARCH === 'true',
        similarity_threshold: 0.7,
        max_results: 10,
        embedding_model: "text-embedding-ada-002"
    };
    constructor() {
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: this.config.embedding_model,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL,
            },
        });
        logger.info('🔍 VectorSearchService initialized', {
            enabled: this.config.enabled,
            model: this.config.embedding_model
        });
    }
    /**
     * 🚀 Lazy Initialization - VectorStore wird nur bei erster Nutzung erstellt
     */
    async initialize(products) {
        if (this.isInitialized)
            return;
        // Verhindere mehrfache Initialisierung
        if (this.initializationPromise) {
            await this.initializationPromise;
            return;
        }
        this.initializationPromise = this._doInitialize(products);
        await this.initializationPromise;
    }
    async _doInitialize(products) {
        const startTime = Date.now();
        try {
            logger.info('🔄 Initializing VectorStore...', {
                product_count: products.length
            });
            // 📄 Erstelle Documents für VectorStore
            const documents = products.map(product => {
                const content = this.createProductContent(product);
                return new Document({
                    pageContent: content,
                    metadata: {
                        id: product.title, // Eindeutige ID
                        title: product.title,
                        price: product.sale_price,
                        brand: product.brand || 'unknown',
                        category: product.product_type || 'unknown',
                        features: product.Key_features?.substring(0, 500) || '',
                        link: product.link || '',
                        // Zusätzliche Suchfelder
                        _category: product._category || 'otros',
                        _screenSize: product._screenSize || 'N/A'
                    }
                });
            });
            // 🏗️ VectorStore erstellen
            this.vectorStore = await HNSWLib.fromDocuments(documents, this.embeddings, {
                space: 'cosine', // Kosinus-Ähnlichkeit für semantische Suche
                numDimensions: 1536, // Ada-002 Embedding-Dimensionen
            });
            this.isInitialized = true;
            const initTime = Date.now() - startTime;
            logger.info('✅ VectorStore initialized successfully', {
                documents_count: documents.length,
                initialization_time_ms: initTime,
                embedding_model: this.config.embedding_model
            });
            performanceLogger.searchPerformance('vector_store_init', documents.length, initTime, false);
        }
        catch (error) {
            const initTime = Date.now() - startTime;
            logger.error('❌ VectorStore initialization failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                initialization_time_ms: initTime,
                product_count: products.length
            });
            // Reset für retry
            this.initializationPromise = null;
            throw error;
        }
    }
    /**
     * 🔍 Semantische Produktsuche
     */
    async searchProducts(query, products, maxResults = 5, priceLimit) {
        const startTime = Date.now();
        try {
            // 🔧 Fallback wenn VectorSearch deaktiviert
            if (!this.config.enabled) {
                return this.fallbackSearch(query, products, maxResults, priceLimit, startTime);
            }
            // 🚀 Lazy Initialization
            if (!this.isInitialized) {
                await this.initialize(products);
            }
            if (!this.vectorStore) {
                logger.warn('⚠️ VectorStore not available, using fallback');
                return this.fallbackSearch(query, products, maxResults, priceLimit, startTime);
            }
            // 🔍 Vector-basierte Suche
            const searchResults = await this.vectorStore.similaritySearchWithScore(query, this.config.max_results, undefined, // Filter (optional)
            {
                threshold: this.config.similarity_threshold
            });
            let matchedProducts = searchResults
                .map(([doc, score]) => {
                const product = products.find(p => p.title === doc.metadata.id);
                return product ? { product, score } : null;
            })
                .filter((item) => item !== null);
            // 💰 Preis-Filter anwenden
            if (priceLimit) {
                matchedProducts = matchedProducts.filter(({ product }) => product.sale_price > 0 && product.sale_price <= priceLimit);
            }
            // 📊 Sortierung: Ähnlichkeit + Preis
            const sortedProducts = matchedProducts
                .sort((a, b) => {
                // Höhere Ähnlichkeit zuerst, dann niedrigerer Preis
                if (Math.abs(a.score - b.score) > 0.1) {
                    return b.score - a.score; // Höhere Scores zuerst
                }
                return a.product.sale_price - b.product.sale_price;
            })
                .slice(0, maxResults);
            const searchTime = Date.now() - startTime;
            logger.debug('🔍 Vector search completed', {
                query,
                results_found: sortedProducts.length,
                search_time_ms: searchTime,
                avg_similarity: sortedProducts.length > 0
                    ? sortedProducts.reduce((sum, r) => sum + r.score, 0) / sortedProducts.length
                    : 0
            });
            return {
                products: sortedProducts.map(r => r.product),
                searchTime,
                method: 'vector',
                similarity_scores: sortedProducts.map(r => r.score)
            };
        }
        catch (error) {
            logger.error('❌ Vector search failed, using fallback', {
                error: error instanceof Error ? error.message : 'Unknown error',
                query
            });
            return this.fallbackSearch(query, products, maxResults, priceLimit, startTime);
        }
    }
    /**
     * 🔄 Fallback: String-basierte Suche (bisherige Methode)
     */
    fallbackSearch(query, products, maxResults, priceLimit, startTime) {
        const searchTerm = query.toLowerCase();
        let matchedProducts = products.filter(p => {
            const validPrice = p.sale_price > 0 &&
                (!priceLimit || p.sale_price <= priceLimit);
            if (!validPrice)
                return false;
            return (p._searchTitle?.includes(searchTerm) ||
                p._searchType?.includes(searchTerm) ||
                p._searchBrand?.includes(searchTerm) ||
                p._category === searchTerm);
        });
        // Sortierung: Preis + einfache Relevanz
        matchedProducts = matchedProducts
            .sort((a, b) => {
            const aRelevance = this.calculateFallbackRelevance(a, searchTerm);
            const bRelevance = this.calculateFallbackRelevance(b, searchTerm);
            if (Math.abs(aRelevance - bRelevance) > 10) {
                return bRelevance - aRelevance;
            }
            return a.sale_price - b.sale_price;
        })
            .slice(0, maxResults);
        const searchTime = Date.now() - startTime;
        return {
            products: matchedProducts,
            searchTime,
            method: 'fallback'
        };
    }
    /**
     * 🔧 Hilfsfunktionen
     */
    createProductContent(product) {
        return [
            product.title,
            product.product_type || '',
            product.brand || '',
            (product.Key_features || '').substring(0, 300),
            `Precio: ${product.sale_price}`,
            `Categoría: ${product._category || 'otros'}`
        ].filter(Boolean).join(' ');
    }
    calculateFallbackRelevance(product, searchTerm) {
        let score = 0;
        if (product._category === searchTerm)
            score += 100;
        if (product._searchTitle?.includes(searchTerm))
            score += 50;
        if (product._searchType?.includes(searchTerm))
            score += 30;
        if (product._searchBrand?.includes(searchTerm))
            score += 20;
        return score;
    }
    /**
     * 📊 Service-Status
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            initialized: this.isInitialized,
            embedding_model: this.config.embedding_model,
            similarity_threshold: this.config.similarity_threshold
        };
    }
    /**
     * 🔄 Cache-Management
     */
    async reset() {
        this.vectorStore = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        logger.info('🔄 VectorSearchService reset');
    }
}
