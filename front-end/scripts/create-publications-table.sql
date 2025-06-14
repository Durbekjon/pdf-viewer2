-- Publications jadvali yaratish
CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  published_at TEXT NOT NULL,
  pdf_files JSONB NOT NULL,
  custom_outlines JSONB NOT NULL DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index qo'shish tezroq qidirish uchun
CREATE INDEX IF NOT EXISTS idx_publications_created_at ON publications(created_at);
CREATE INDEX IF NOT EXISTS idx_publications_published_at ON publications(published_at);

-- RLS (Row Level Security) o'chirish - public access uchun
ALTER TABLE publications DISABLE ROW LEVEL SECURITY;

-- Trigger yaratish updated_at ni avtomatik yangilash uchun
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_publications_updated_at 
    BEFORE UPDATE ON publications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Test ma'lumot qo'shish
INSERT INTO publications (
  id, 
  title, 
  published_at, 
  pdf_files, 
  custom_outlines, 
  view_count
) VALUES (
  'test_publication_001',
  'Test PDF Nashr',
  '2024-01-01',
  '{"uz": {"name": "test.pdf", "data": "base64data", "type": "application/pdf", "size": 1024}}',
  '{"uz": [{"title": "Test Bob", "page": 1}]}',
  0
) ON CONFLICT (id) DO NOTHING;

SELECT 'Publications table created successfully!' as message;
