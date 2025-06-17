import fs from "fs";
import path from "path";
import csvParser from "csv-parser";

export type AlkostoProduct = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  resolucion?: string;
  tamaño_pantalla?: string;
  tipo_panel?: string;
  frecuencia_actualizacion?: string;
  marca?: string;
  uso_principal?: string;
};

export type ProductQuery = {
  kategorie?: string;
  presupuesto_max?: number;
  resolucion?: string;
  tamaño_pantalla?: string;
  tipo_panel?: string;
  frecuencia_actualizacion?: string;
  marca?: string;
  uso_principal?: string;
};

export async function loadProductsFromCSV(csvFilePath: string): Promise<AlkostoProduct[]> {
  const products: AlkostoProduct[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on("data", (row: any) => {
        const producto: AlkostoProduct = {
          id: row.id,
          nombre: row.nombre,
          categoria: row.categoria,
          precio: parseFloat(row.precio),
          resolucion: row.resolucion,
          tamaño_pantalla: row.tamaño_pantalla,
          tipo_panel: row.tipo_panel,
          frecuencia_actualizacion: row.frecuencia_actualizacion,
          marca: row.marca,
          uso_principal: row.uso_principal,
        };
        products.push(producto);
      })
      .on("end", () => resolve(products))
      .on("error", reject);
  });
}

export function searchProducts(query: ProductQuery, allProducts: AlkostoProduct[]): AlkostoProduct[] {
  return allProducts.filter((product) => {
    if (query.kategorie && product.categoria !== query.kategorie) return false;
    if (query.presupuesto_max && product.precio > query.presupuesto_max) return false;
    if (query.resolucion && product.resolucion !== query.resolucion) return false;
    if (query.tamaño_pantalla && product.tamaño_pantalla !== query.tamaño_pantalla) return false;
    if (query.tipo_panel && product.tipo_panel !== query.tipo_panel) return false;
    if (query.frecuencia_actualizacion && product.frecuencia_actualizacion !== query.frecuencia_actualizacion)
      return false;
    if (query.marca && product.marca !== query.marca) return false;
    if (query.uso_principal && product.uso_principal !== query.uso_principal) return false;
    return true;
  });
}
