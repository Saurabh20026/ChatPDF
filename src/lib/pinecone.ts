import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import {
    Document,
    RecursiveCharacterTextSplitter,
  } from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import md5 from "md5";
import { convertToAscii } from "./utils";



// let pinecone: PineconeClient | null = null;

// export const getPineconeClient = async () => {
//     if (!pinecone) {
//         pinecone = new PineconeClient()
//         await pinecone.init({
//             environment: process.env.PINECONE_ENVIRONMENT!,
//             apiKey: process.env.PINECONE_API_KEY!,
//         });
//     };
//     return pinecone
// }

export const getPineconeClient = () => {
    return new Pinecone({
    //   environment: process.env.PINECONE_ENVIRONMENT!,
      apiKey: process.env.PINECONE_API_KEY!,
    });
  };


type PDFPage = {
    pageContent: string;
    metadata: {
      loc: { pageNumber: number };
    };
  };


export async function loadS3IntoPinecone(fileKey: string) {
    // 1. obtain the pdf -> downlaod and read from pdf
    console.log("downloading s3 into file system");
    const file_name = await downloadFromS3(fileKey);
    if (!file_name) {
      throw new Error("could not download from s3");
    }
    console.log("loading pdf into memory" + file_name);
    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];
    console.log("check one ");
    // return pages
  
    // 2. split and segment the pdf
    const documents = await Promise.all(pages.map(prepareDocument));
    console.log("check two ");

    // // 3. vectorise and embed individual documents
    const vectors = await Promise.all(documents.flat().map(embedDocument));
    console.log("check three ");

    // 4. upload to pinecone
    const client = await getPineconeClient();
    const pineconeIndex = await client.index("chatpdf");
    const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
  
    console.log("inserting vectors into pinecone");

    await namespace.upsert(vectors);
  
    return documents[0];
  }

  async function embedDocument(doc: Document) {
    try {
      const embeddings = await getEmbeddings(doc.pageContent);
      // for hashing
      const hash = md5(doc.pageContent);
  
      return {
        id: hash,
        values: embeddings,
        metadata: {
          text: doc.metadata.text,
          pageNumber: doc.metadata.pageNumber,
        },
      } as PineconeRecord;
    } catch (error) {
      console.log("error embedding document", error);
      throw error;
    }
  }

// making sure that the string that e pass is within the correct byte size
  export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder();
    return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
  };


  // split single page into multiple paragraphs (one page is a object from a array of multiple objects)
  async function prepareDocument(page: PDFPage) {
    let { pageContent, metadata } = page;
    pageContent = pageContent.replace(/\n/g, "");
    // split the docs
    const splitter = new RecursiveCharacterTextSplitter();
    const docs = await splitter.splitDocuments([
      new Document({
        pageContent,
        metadata: {
          pageNumber: metadata.loc.pageNumber,
          text: truncateStringByBytes(pageContent, 36000),
        },
      }),
    ]);
    return docs;
  }