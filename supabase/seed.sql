-- seed.sql
-- EstateMind demo data for development.
-- Run: supabase db reset (applies migrations + seed)

-- Demo Rent Opportunities (matching the original SAMPLE_APARTMENTS)
-- These will be created through the opportunity_workspace_service
-- using the standard createOpportunityForModule flow.

-- Note: This seed requires an existing organization.
-- Replace 'YOUR_ORG_ID' with a real organization UUID after first login.

-- INSERT INTO properties (id, organization_id, title, country, city, district, address, property_type, asking_price, currency, size_sqm, bedrooms, condition, listing_url, description)
-- VALUES
--   (gen_random_uuid(), 'YOUR_ORG_ID', 'Modern 2BR near Liman Park', 'Serbia', 'Novi Sad', 'Liman 2', 'Bulevar Cara Lazara 42', 'apartment', 650, 'EUR', 55, 2, 'good', '', 'Bright apartment with park view. Close to university campus, Danube promenade, and multiple bus lines.'),
--   (gen_random_uuid(), 'YOUR_ORG_ID', 'Cozy 1BR in Grbavica', 'Serbia', 'Novi Sad', 'Grbavica', 'Brace Ribnikar 18', 'apartment', 600, 'EUR', 48, 1, 'good', '', 'Compact one-bedroom, fully furnished. Walking distance to Futoska pijaca and city center.'),
--   (gen_random_uuid(), 'YOUR_ORG_ID', 'Spacious 3BR in Podbara', 'Serbia', 'Novi Sad', 'Podbara', 'Jovana Subotica 7', 'apartment', 700, 'EUR', 60, 3, 'good', '', 'Large three-bedroom apartment in a quiet residential area. Near Almaška crkva and the Danube.');

-- After inserting properties, create corresponding opportunities:
-- INSERT INTO opportunities (id, organization_id, property_id, module_type, stage, title, ...)
-- VALUES (...);
