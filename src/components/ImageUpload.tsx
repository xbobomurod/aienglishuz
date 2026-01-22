import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface ImageUploadProps {
  onImageChange: (imageData: { url: string; description: string } | null) => void;
}

export function ImageUpload({ onImageChange }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"upload" | "describe">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        setPreview(url);
        onImageChange({ url, description: "User uploaded image" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    if (text.trim()) {
      onImageChange({ url: "", description: text });
    } else {
      onImageChange(null);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setDescription("");
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "upload" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("upload")}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
          <Button
            variant={mode === "describe" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("describe")}
            className="flex-1"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Describe Scene
          </Button>
        </div>

        {mode === "upload" ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleClear}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click to upload an image
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Describe a scene for the speaking task. Be specific about what's in the image:
            </p>
            <Textarea
              placeholder="Example: A busy city street at sunset. There are tall buildings on both sides. People are walking on the sidewalk. A red bus is stopped at a traffic light. There's a coffee shop on the corner with outdoor seating..."
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            {description && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {mode === "upload" 
            ? "Upload an image to describe during your speaking practice."
            : "Or describe a hypothetical scene - the AI will evaluate your description skills."}
        </p>
      </CardContent>
    </Card>
  );
}
