// src/utils/product-vector-store.ts
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import path from "path";
import fs from "fs/promises";
export class ProductVectorStore {
    vectorStore = null;
    embeddings;
    indexPath;
    isInitialized = false;
    constructor() {
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
            },
            modelName: "text-embedding-3-small",
        });
        this.indexPath = path.join(process.cwd(), process.env.VECTOR_INDEX_PATH || "vector_index");
    }
    async initialize(products) {
        try {
            if (await this.indexExists()) {
                console.log("📂 Loading existing vector index...");
                this.vectorStore = await HNSWLib.load(this.indexPath, this.embeddings);
                console.log("✅ Vector index loaded successfully");
            }
            else {
                console.log("🔨 Creating new vector index...");
                await this.createNewIndex(products);
                console.log("✅ Vector index created and saved");
            }
            this.isInitialized = true;
        }
        catch (error) {
            console.error("❌ Error initializing vector store:", error);
            await this.createNewIndex(products);
            this.isInitialized = true;
        }
    }
    async createNewIndex(products) {
        const documents = products.map(product => {
            const searchText = this.createSearchText(product);
            return new Document({
                pageContent: searchText,
                metadata: {
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    category: product.category,
                    brand: product.brand,
                    originalProduct: product
                }
            });
        });
        this.vectorStore = await HNSWLib.fromDocuments(documents, this.embeddings);
        await this.vectorStore.save(this.indexPath);
    }
    createSearchText(product) {
        const parts = [
            product.title,
            product.brand,
            product.category,
            product._category,
            product.type,
            product.features || "",
            this.getPriceCategory(product.price),
            product.screen_size ? `${product.screen_size} pulgadas` : "",
            product.color || "",
        ].filter(Boolean);
        return parts.join(" ").toLowerCase();
    }
    getPriceCategory(price) {
        if (price < 500000)
            return "económico barato accesible";
        if (price < 1000000)
            return "precio medio moderado";
        if (price < 2000000)
            return "precio alto premium";
        if (price < 5000000)
            return "costoso caro exclusivo";
        return "lujo premium alta gama";
    }
    async searchSimilar(query, options = {}) {
        if (!this.isInitialized || !this.vectorStore) {
            throw new Error("Vector store not initialized. Call initialize() first.");
        }
        const { k = 5, minSimilarity = 0.3, maxPrice, category } = options;
        try {
            const enhancedQuery = this.enhanceQuery(query);
            const searchResults = await this.vectorStore.similaritySearchWithScore(enhancedQuery, k * 2);
            const results = searchResults
                .map(([doc, score]) => {
                const product = doc.metadata.originalProduct;
                const similarity = 1 - score;
                return {
                    product,
                    score,
                    similarity
                };
            })
                .filter(result => {
                if (result.similarity < minSimilarity)
                    return false;
                if (maxPrice && result.product.price > maxPrice)
                    return false;
                if (category) {
                    const productCategory = result.product.category.toLowerCase();
                    const targetCategory = category.toLowerCase();
                    if (!productCategory.includes(targetCategory) &&
                        !result.product._category.toLowerCase().includes(targetCategory)) {
                        return false;
                    }
                }
                return true;
            })
                .slice(0, k);
            console.log(`🔍 Vector search for "${query}": ${results.length} results found`);
            return results;
        }
        catch (error) {
            console.error("❌ Error in vector search:", error);
            return [];
        }
    }
    enhanceQuery(query) {
        const lowerQuery = query.toLowerCase();
        const enhancements = [];
        if (lowerQuery.includes("televisor") || lowerQuery.includes("tv")) {
            enhancements.push("televisión pantalla smart tv");
        }
        if (lowerQuery.includes("refrigerador") || lowerQuery.includes("nevera")) {
            enhancements.push("refrigeración cocina electrodoméstico");
        }
        if (lowerQuery.includes("lavadora")) {
            enhancements.push("lavado ropa electrodoméstico hogar");
        }
        if (lowerQuery.includes("computador") || lowerQuery.includes("laptop")) {
            enhancements.push("computación tecnología portátil");
        }
        if (lowerQuery.includes("barato") || lowerQuery.includes("económico")) {
            enhancements.push("precio bajo accesible");
        }
        if (lowerQuery.includes("bueno") || lowerQuery.includes("calidad")) {
            enhancements.push("alta calidad premium recomendado");
        }
        return [query, ...enhancements].join(" ");
    }
    async hybridSearch(query, products, options = {}) {
        const { vectorWeight = 0.7, keywordWeight = 0.3, k = 5, maxPrice } = options;
        const vectorResults = await this.searchSimilar(query, { k: k * 2, maxPrice });
        const keywordResults = this.keywordSearch(query, products, maxPrice);
        const combinedResults = new Map();
        vectorResults.forEach(result => {
            combinedResults.set(result.product.id, {
                ...result,
                score: result.similarity * vectorWeight
            });
        });
        keywordResults.forEach(product => {
            const existingResult = combinedResults.get(product.id);
            const keywordScore = this.calculateKeywordScore(query, product);
            if (existingResult) {
                existingResult.score += keywordScore * keywordWeight;
            }
            else {
                combinedResults.set(product.id, {
                    product,
                    score: keywordScore * keywordWeight,
                    similarity: keywordScore
                });
            }
        });
        return Array.from(combinedResults.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
    }
    keywordSearch(query, products, maxPrice) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        return products.filter(product => {
            if (maxPrice && product.price > maxPrice)
                return false;
            const searchText = this.createSearchText(product);
            return queryTerms.some(term => searchText.includes(term));
        });
    }
    calculateKeywordScore(query, product) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const searchText = this.createSearchText(product);
        let matchCount = 0;
        queryTerms.forEach(term => {
            if (searchText.includes(term)) {
                matchCount++;
            }
        });
        return matchCount / queryTerms.length;
    }
    async indexExists() {
        try {
            const stat = await fs.stat(this.indexPath);
            return stat.isDirectory();
        }
        catch {
            return false;
        }
    }
    async clearIndex() {
        try {
            await fs.rm(this.indexPath, { recursive: true, force: true });
            console.log("🗑️ Vector index cleared");
        }
        catch (error) {
            console.error("❌ Error clearing index:", error);
        }
    }
    getStats() {
        return {
            isInitialized: this.isInitialized,
            indexPath: this.indexPath
        };
    }
}
