// import { PutObjectCommandOutput, S3 } from "@aws-sdk/client-s3";
import AWS from 'aws-sdk'
import { Param } from 'drizzle-orm';

export async function uploadToS3 (file: File) {
    try {
        AWS.config.update({
          accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
        });
        const s3 = new AWS.S3({
            params: {
                Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
            },
            region: 'ap-south-1'
          });

          const file_key= 'uploads/' + Date.now().toString() + file.name.replace('','-')

          const params = {
            Bucket : process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
            Key: file_key,
            Body: file
          }

          // to monitor the progress when we uploada large file on the s3 bucket
          const upload= s3.putObject(params).on('httpUploadProgress', evt => {
            console.log('uploading to s3...', parseInt(((evt.loaded*100) / evt.total).toString())) + "%"
          }).promise()

          // called when the upload is completed
          await upload.then(data => {
            console.log('sucessfully uploaded to s3!', file_key)
          })

          return Promise.resolve({
            file_key,
            file_name: file.name
          })

    } catch (error) {}
}

// gives a public url of the pdf which can be embedded to the S3
export function getS3Url(file_key: string) {
    const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${file_key}`;
    return url;
  }