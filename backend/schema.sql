-- ==========================================================
-- Schema: ระบบจัดการข้อมูลคณะวิศวกรรมศาสตร์
-- รันไฟล์นี้ครั้งเดียวตอนตั้งฐานข้อมูล เช่น:
--   psql -U postgres -d engineering_db -f schema.sql
-- ==========================================================

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  head_user_id INTEGER -- FK ไป users เติมทีหลังด้วย ALTER (กัน circular reference ตอนสร้าง)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT, -- ไม่บังคับ เพราะบัญชีที่สมัครผ่าน Google จะไม่มีรหัสผ่าน
  google_id VARCHAR(255) UNIQUE, -- เก็บ Google account id เมื่อ login ผ่าน Google
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  position VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('lecturer', 'head', 'staff', 'admin')),
  phone VARCHAR(50),
  profile_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE departments
  ADD CONSTRAINT fk_department_head
  FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS leave_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  max_days_per_year INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  UNIQUE (user_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC(5,1) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  reject_reason TEXT,
  attachment_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  posted_by INTEGER REFERENCES users(id),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  category VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ข้อมูลตั้งต้น: ประเภทการลา
INSERT INTO leave_types (name, max_days_per_year) VALUES
  ('ลาป่วย', 30),
  ('ลากิจ', 10),
  ('ลาพักร้อน', 10)
ON CONFLICT DO NOTHING;

-- ตัวอย่างสาขา
INSERT INTO departments (name) VALUES
  ('วิศวกรรมคอมพิวเตอร์'),
  ('วิศวกรรมไฟฟ้า'),
  ('วิศวกรรมโยธา')
ON CONFLICT DO NOTHING;
