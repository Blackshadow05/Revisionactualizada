import { useUpload } from '@/context/UploadContext';

interface UploadProgressProps {
  revisionId: string;
}

export default function UploadProgress({ revisionId }: UploadProgressProps) {
  const { getUploadsByRevision } = useUpload();
  const uploads = getUploadsByRevision(revisionId);

  if (uploads.length === 0) return null;

  return (
    <div className="space-y-4">
      {uploads.map((upload) => (
        <div key={upload.id} className="bg-[#1e2538] rounded-lg p-4 border border-[#3d4659]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">{upload.fileName}</span>
            <span className="text-sm text-gray-400">{Math.round(upload.progress)}%</span>
          </div>
          <div className="w-full bg-[#2a3347] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                upload.status === 'error'
                  ? 'bg-red-500'
                  : upload.status === 'completed'
                  ? 'bg-green-500'
                  : 'bg-[#c9a45c]'
              }`}
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          <div className="mt-2">
            <span className={`text-sm ${
              upload.status === 'error'
                ? 'text-red-500'
                : upload.status === 'completed'
                ? 'text-green-500'
                : 'text-[#c9a45c]'
            }`}>
              {upload.message || upload.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
} 