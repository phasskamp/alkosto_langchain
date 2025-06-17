export function safeJsonParse<T>(
  input: string, 
  fallback: T, 
  context = "safeJsonParse"
): T {
  try {
    if (!input || !input.trim()) {
      console.warn(`⚠️ [${context}] Empty input. Using fallback.`);
      return fallback;
    }

    const parsed = JSON.parse(input.trim());
    
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn(`⚠️ [${context}] Invalid JSON structure. Using fallback.`);
      return fallback;
    }
    
    console.log(`✅ [${context}] JSON parsed successfully`);
    return parsed as T;
    
  } catch (err) {
    console.warn(`❌ [${context}] Failed to parse JSON. Trying plain text fallback.\nInput: "${input?.substring(0, 50)}..."`, err);
    
    // Plain Text Fallback
    if (typeof input === 'string' && input.trim() && !input.startsWith('{')) {
      console.log(`🔄 [${context}] Converting plain text to structured format`);
      return { input: input.trim() } as T;
    }
    
    return fallback;
  }
}
