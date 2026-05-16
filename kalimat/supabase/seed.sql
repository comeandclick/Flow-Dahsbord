-- ============================================================
-- KALIMAT — Données de base
-- ============================================================

-- Courses
insert into courses (title, description, slug, level, "order", is_published) values
  ('Les chiffres', 'Apprenez les chiffres de 0 à 100 en arabe.', 'les-chiffres', 'beginner', 1, true),
  ('Les couleurs', 'Les couleurs essentielles en arabe.', 'les-couleurs', 'beginner', 2, true),
  ('Les jours', 'Les jours de la semaine en arabe.', 'les-jours', 'beginner', 3, true),
  ('Les mois', 'Les mois de l''année en arabe.', 'les-mois', 'beginner', 4, true),
  ('La famille', 'Le vocabulaire de la famille en arabe.', 'la-famille', 'beginner', 5, true),
  ('Les pronoms', 'Les pronoms personnels en arabe.', 'les-pronoms', 'beginner', 6, true),
  ('Les couleurs', 'Les couleurs en arabe moderne.', 'les-couleurs-avance', 'intermediate', 7, true),
  ('Les verbes de base', 'Les verbes les plus courants en arabe.', 'les-verbes-de-base', 'intermediate', 8, true),
  ('Les phrases utiles', 'Phrases essentielles pour communiquer.', 'les-phrases-utiles', 'beginner', 9, true),
  ('Les objets du quotidien', 'Objets de la vie courante en arabe.', 'les-objets-du-quotidien', 'beginner', 10, true)
on conflict (slug) do nothing;

-- Words — Les chiffres
with c as (select id from courses where slug = 'les-chiffres')
insert into words (arabic, french, phonetic, course_id, level) values
  ('صفر', 'zéro', 'sifr', (select id from c), 'beginner'),
  ('واحد', 'un', 'wahid', (select id from c), 'beginner'),
  ('اثنان', 'deux', 'ithnan', (select id from c), 'beginner'),
  ('ثلاثة', 'trois', 'thalatha', (select id from c), 'beginner'),
  ('أربعة', 'quatre', 'arba''a', (select id from c), 'beginner'),
  ('خمسة', 'cinq', 'khamsa', (select id from c), 'beginner'),
  ('ستة', 'six', 'sitta', (select id from c), 'beginner'),
  ('سبعة', 'sept', 'sab''a', (select id from c), 'beginner'),
  ('ثمانية', 'huit', 'thamaniya', (select id from c), 'beginner'),
  ('تسعة', 'neuf', 'tis''a', (select id from c), 'beginner'),
  ('عشرة', 'dix', '''ashara', (select id from c), 'beginner')
on conflict do nothing;

-- Words — Les couleurs
with c as (select id from courses where slug = 'les-couleurs')
insert into words (arabic, french, phonetic, course_id, level) values
  ('أحمر', 'rouge', 'ahmar', (select id from c), 'beginner'),
  ('أزرق', 'bleu', 'azraq', (select id from c), 'beginner'),
  ('أخضر', 'vert', 'akhdar', (select id from c), 'beginner'),
  ('أصفر', 'jaune', 'asfar', (select id from c), 'beginner'),
  ('أبيض', 'blanc', 'abyad', (select id from c), 'beginner'),
  ('أسود', 'noir', 'aswad', (select id from c), 'beginner'),
  ('برتقالي', 'orange', 'burtuqali', (select id from c), 'beginner'),
  ('بنفسجي', 'violet', 'banafsaji', (select id from c), 'beginner')
on conflict do nothing;

-- Words — Les jours
with c as (select id from courses where slug = 'les-jours')
insert into words (arabic, french, phonetic, course_id, level) values
  ('الاثنين', 'lundi', 'al-ithnayn', (select id from c), 'beginner'),
  ('الثلاثاء', 'mardi', 'ath-thulatha', (select id from c), 'beginner'),
  ('الأربعاء', 'mercredi', 'al-arbi''a', (select id from c), 'beginner'),
  ('الخميس', 'jeudi', 'al-khamis', (select id from c), 'beginner'),
  ('الجمعة', 'vendredi', 'al-jum''a', (select id from c), 'beginner'),
  ('السبت', 'samedi', 'as-sabt', (select id from c), 'beginner'),
  ('الأحد', 'dimanche', 'al-ahad', (select id from c), 'beginner')
on conflict do nothing;

-- Words — La famille
with c as (select id from courses where slug = 'la-famille')
insert into words (arabic, french, phonetic, course_id, level) values
  ('أب', 'père', 'ab', (select id from c), 'beginner'),
  ('أم', 'mère', 'umm', (select id from c), 'beginner'),
  ('أخ', 'frère', 'akh', (select id from c), 'beginner'),
  ('أخت', 'soeur', 'ukht', (select id from c), 'beginner'),
  ('ابن', 'fils', 'ibn', (select id from c), 'beginner'),
  ('بنت', 'fille', 'bint', (select id from c), 'beginner'),
  ('جد', 'grand-père', 'jadd', (select id from c), 'beginner'),
  ('جدة', 'grand-mère', 'jadda', (select id from c), 'beginner'),
  ('عم', 'oncle paternel', '''amm', (select id from c), 'beginner'),
  ('خال', 'oncle maternel', 'khal', (select id from c), 'beginner')
on conflict do nothing;

-- Words — Les pronoms
with c as (select id from courses where slug = 'les-pronoms')
insert into words (arabic, french, phonetic, course_id, level) values
  ('أنا', 'je / moi', 'ana', (select id from c), 'beginner'),
  ('أنت', 'tu (masc.)', 'anta', (select id from c), 'beginner'),
  ('أنتِ', 'tu (fém.)', 'anti', (select id from c), 'beginner'),
  ('هو', 'il', 'huwa', (select id from c), 'beginner'),
  ('هي', 'elle', 'hiya', (select id from c), 'beginner'),
  ('نحن', 'nous', 'nahnu', (select id from c), 'beginner'),
  ('أنتم', 'vous', 'antum', (select id from c), 'beginner'),
  ('هم', 'ils', 'hum', (select id from c), 'beginner')
on conflict do nothing;

-- Words — Les phrases utiles
with c as (select id from courses where slug = 'les-phrases-utiles')
insert into words (arabic, french, phonetic, course_id, level) values
  ('مرحبا', 'bonjour / salut', 'marhaba', (select id from c), 'beginner'),
  ('شكرا', 'merci', 'shukran', (select id from c), 'beginner'),
  ('من فضلك', 's''il vous plaît', 'min fadlak', (select id from c), 'beginner'),
  ('عفوا', 'de rien / pardon', '''afwan', (select id from c), 'beginner'),
  ('نعم', 'oui', 'na''am', (select id from c), 'beginner'),
  ('لا', 'non', 'la', (select id from c), 'beginner'),
  ('كيف حالك', 'comment vas-tu ?', 'kayfa halak', (select id from c), 'beginner'),
  ('بخير', 'bien / ça va', 'bikhayr', (select id from c), 'beginner'),
  ('إلى اللقاء', 'au revoir', 'ila al-liqa', (select id from c), 'beginner'),
  ('أتكلم العربية', 'je parle arabe', 'atakallam al-''arabiyya', (select id from c), 'beginner')
on conflict do nothing;
