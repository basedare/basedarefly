import { NextRequest, NextResponse } from 'next/server';
import { base44 } from '@/lib/base44Client';

/**
 * POST /api/upload
 * Upload a file (image, video, etc.) using Base44's file upload service
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to a format Base44 SDK expects
    // This may need adjustment based on actual Base44 SDK API
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: file.type });

    // Upload file using Base44 integration
    const result = await base44.integrations.Core.UploadFile({
      file: fileBlob,
      filename: file.name,
    });

    return NextResponse.json({
      success: true,
      data: {
        file_url: result.file_url,
        file_id: result.file_id,
      },
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}



