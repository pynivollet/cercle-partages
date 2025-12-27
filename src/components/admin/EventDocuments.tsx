import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  getEventDocuments, 
  uploadEventDocument, 
  deleteEventDocument, 
  EventDocument 
} from "@/services/eventDocuments";
import { toast } from "sonner";
import { FileText, Trash2, Upload, Loader2 } from "lucide-react";

interface EventDocumentsProps {
  eventId: string;
  userId: string;
}

const EventDocuments = ({ eventId, userId }: EventDocumentsProps) => {
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    const { data, error } = await getEventDocuments(eventId);
    if (data && !error) {
      setDocuments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [eventId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} n'est pas un fichier PDF`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} dépasse la limite de 10 Mo`);
        continue;
      }

      const { data, error } = await uploadEventDocument(eventId, file, userId);
      if (error) {
        toast.error(`Erreur lors de l'upload de ${file.name}`);
      } else if (data) {
        setDocuments((prev) => [...prev, data]);
        toast.success(`${file.name} uploadé`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: EventDocument) => {
    const { error } = await deleteEventDocument(doc.id, doc.file_url);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Document supprimé");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-sans text-sm font-medium">Documents PDF</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Ajouter
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun document</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-destructive shrink-0" />
                <div className="min-w-0">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {doc.file_name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(doc)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventDocuments;
