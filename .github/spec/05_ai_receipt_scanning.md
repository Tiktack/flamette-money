# Spec: AI Receipt Scanning

## 1. Overview
Automate data entry by uploading receipt images. Use Google Gemini Flash model to perform OCR and structured data extraction into our JSON format.

## 2. Infrastructure
- **Service**: `ReceiptScannerService`.
- **External Dependency**: Google Gemini API (Flash model).
- **Configuration**: API Key stored in `UserSecrets`/`appsettings`.

## 3. Workflow

### 3.1 Prompt Strategy
We need a robust system prompt to guide Gemini.
- **Context**: "You are a receipt parsing assistant."
- **Input**: Image + List of existing Categories/Subcategories (for mapping).
- **Output**: JSON string matching our `CreateTransactionRequest` structure + Items.
- **Requirement**: Ask Gemini to deduce Category based on item name if not obvious, or map to closest existing category provided in the prompt.

### 3.2 API Endpoint
- **POST** `/api/receipts/scan`
- **Body**: `Multipart/Form-Data` (The Image).
- **Process**:
    1. Receive image.
    2. Convert to Base64 or stream.
    3. Retrieve current user's Category List (Names and IDs).
    4. Construct Prompt: 
       > "Analyze this receipt. List items with quantity, unit, price. Map categories to this list: [Cat1, Cat2...]. Output JSON: { ... }"
    5. Call Gemini API.
    6. Parse JSON response.
    7. **Return**: The constructed Transaction object (Draft). NOT saved to DB yet. 
       - User needs to review/confirm in UI before saving.

## 4. JSON Structure (Expected from AI)
```json
{
  "merchant": "Target",
  "date": "2024-02-05",
  "amount": 25.50,
  "currency": "USD",
  "items": [
    {
      "name": "Milk",
      "quantity": 1,
      "unit": "gallon",
      "unitPrice": 3.99,
      "category": "Food"
    }
  ]
}
```

## 5. Implementation Steps
1. Get Google Cloud Vertex AI or Gemini API Key.
2. Implement `GeminiClient` in `Infrastructure`.
3. Create `ScanEndpoint`.
4. HAndle Prompt Engineering (Iterate to handle edge cases like discounts, tax, tips).
    - Note: Tax and Tip should be separate items or distributed? Ideally `Tax` line item or separate field.

## 6. Acceptance Criteria
- Upload a receipt image (JPG/PNG).
- Receive a JSON response with ~90% accuracy on Date, Total, and Line Items.
- Categories are mapped to existing DB categories where possible.
