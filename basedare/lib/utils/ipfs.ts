/**
 * Centralized IPFS upload utility using the local API route.
 * Intended for client-side use to upload files to Pinata safely.
 */

export interface IpfsUploadResponse {
    success: boolean;
    cid?: string;
    url?: string;
    status?: string;
    error?: string;
}

export async function uploadProofToIpfs(file: File, dareId: string): Promise<IpfsUploadResponse> {
    if (!file) {
        return { success: false, error: 'No file provided.' };
    }

    if (!dareId) {
        return { success: false, error: 'Dare ID is required.' };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dareId', dareId);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
            return { success: false, error: data.error || 'Server error during upload.' };
        }

        return {
            success: true,
            cid: data.cid,
            url: data.url,
            status: data.status,
        };
    } catch (error: any) {
        console.error('IPFS Upload utility error:', error);
        return { success: false, error: 'Network error occurred during upload.' };
    }
}
