import cloudinary from '../core/cloudinary'; // Import your config
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

/**
 * Uploads a file buffer to Cloudinary and returns the result.
 * @param fileBuffer - The buffer from req.file.buffer
 * @param folder - Optional folder name in Cloudinary
 */
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = 'metric_resumes'
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image', // Mandatory for PDFs
        format: 'pdf',
        folder: folder,
        access_mode: 'public',
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error("Cloudinary upload failed with no result."));
        }
        resolve(result);
      }
    );

    // Write the buffer to the stream and end it
    uploadStream.end(fileBuffer);
  });
};