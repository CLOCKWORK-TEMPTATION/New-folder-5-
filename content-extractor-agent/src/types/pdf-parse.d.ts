declare module "pdf-parse" {
  type PdfParseResult = {
    text: string;
    numpages: number;
  };

  export default function pdfParse(
    dataBuffer: Buffer | Uint8Array,
  ): Promise<PdfParseResult>;
}
