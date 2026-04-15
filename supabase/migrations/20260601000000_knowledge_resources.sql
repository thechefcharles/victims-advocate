-- Domain 5.2 — Knowledge Resources catalog.
--
-- Distinct from the existing `knowledge_entries` table (which stores
-- platform content entries for eligibility / documents / definitions).
-- `knowledge_resources` is the external-resource catalog: hotlines, legal
-- aid organizations, government programs, shelters — anything applicants
-- may need that isn't itself a platform-registered provider organization.

CREATE TABLE IF NOT EXISTS knowledge_resources (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  description        text NOT NULL,
  resource_type      text NOT NULL CHECK (resource_type IN (
    'emergency_aid',
    'legal_aid',
    'shelter',
    'counseling',
    'hotline',
    'government_program',
    'food_assistance',
    'housing_assistance',
    'transportation',
    'childcare',
    'employment',
    'other'
  )),
  geographic_scope   text NOT NULL CHECK (geographic_scope IN (
    'national',
    'illinois',
    'indiana',
    'cook_county',
    'chicago',
    'other_local'
  )),
  contact_phone      text,
  contact_email      text,
  website_url        text,
  address            text,
  languages          text[] NOT NULL DEFAULT ARRAY['en'],
  availability       text,
  eligibility_notes  text,
  crime_types_served text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active          boolean NOT NULL DEFAULT true,
  is_verified        boolean NOT NULL DEFAULT false,
  last_verified_at   timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Full-text search over title + description + eligibility_notes.
CREATE INDEX IF NOT EXISTS knowledge_resources_fts
  ON knowledge_resources
  USING gin (
    to_tsvector(
      'english',
      title || ' ' || description || ' ' || COALESCE(eligibility_notes, '')
    )
  );

CREATE INDEX IF NOT EXISTS knowledge_resources_type_idx
  ON knowledge_resources (resource_type);
CREATE INDEX IF NOT EXISTS knowledge_resources_geo_idx
  ON knowledge_resources (geographic_scope);
CREATE INDEX IF NOT EXISTS knowledge_resources_active_idx
  ON knowledge_resources (is_active);
CREATE INDEX IF NOT EXISTS knowledge_resources_crime_types_idx
  ON knowledge_resources USING gin (crime_types_served);

ALTER TABLE knowledge_resources ENABLE ROW LEVEL SECURITY;

-- Public read of active resources (the catalog is not sensitive — it's
-- curated external resources). Admin writes via service role only.
CREATE POLICY knowledge_resources_authenticated_read
  ON knowledge_resources FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY knowledge_resources_service_all
  ON knowledge_resources FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Seed — 14 Illinois + national resources.
-- All seeded with is_verified=false so ops review is required before any
-- resource is surfaced as "authoritative" in downstream UIs.
-- ---------------------------------------------------------------------------

INSERT INTO knowledge_resources (
  title, description, resource_type, geographic_scope,
  contact_phone, website_url, languages, availability,
  eligibility_notes, crime_types_served, is_active, is_verified
) VALUES
  (
    'Illinois Crime Victims Compensation Program',
    'State program that reimburses victims of violent crime in Illinois for medical bills, lost wages, funeral expenses, and counseling. Administered by the Illinois Attorney General.',
    'government_program', 'illinois',
    '1-800-228-3368',
    'https://illinoisattorneygeneral.gov/victims/cvca.html',
    ARRAY['en','es'],
    'Mon-Fri, 8:30am-5pm CT',
    'Illinois residents OR non-residents victimized in Illinois. Must report crime to police within 72 hours (exceptions for DV/SA). File within 2 years.',
    ARRAY['domestic_violence','sexual_assault','homicide','community_violence','other'],
    true, false
  ),
  (
    'Illinois Attorney General Victim Services',
    'Statewide victim services coordination, court support, and referrals. Includes VINE notification and grant-funded victim service programs.',
    'government_program', 'illinois',
    '1-800-228-3368',
    'https://illinoisattorneygeneral.gov/victims',
    ARRAY['en','es'],
    'Mon-Fri, 8:30am-5pm CT',
    'Open to all Illinois crime victims.',
    ARRAY['domestic_violence','sexual_assault','homicide','community_violence','human_trafficking','other'],
    true, false
  ),
  (
    'Illinois Domestic Violence Hotline',
    '24/7 hotline operated by the Illinois Coalition Against Domestic Violence. Confidential support, safety planning, and referrals to local shelters and programs.',
    'hotline', 'illinois',
    '1-877-863-6338',
    'https://www.ilcadv.org',
    ARRAY['en','es'],
    '24/7',
    'Anyone affected by domestic violence in Illinois.',
    ARRAY['domestic_violence'],
    true, false
  ),
  (
    'Chicago CARES',
    'City of Chicago emergency assistance for victims of violent crime — rental assistance, relocation, medical copays, and funeral support.',
    'emergency_aid', 'chicago',
    '311',
    'https://www.chicago.gov/city/en/depts/mayor/provdrs/cares.html',
    ARRAY['en','es'],
    'Mon-Fri business hours',
    'Chicago residents who are victims of violent crime.',
    ARRAY['community_violence','homicide','domestic_violence'],
    true, false
  ),
  (
    'Illinois Legal Aid Online',
    'Free legal information, automated legal forms, and referrals to Illinois legal aid organizations.',
    'legal_aid', 'illinois',
    NULL,
    'https://www.illinoislegalaid.org',
    ARRAY['en','es'],
    'Online, 24/7',
    'Open to anyone with an Illinois legal question.',
    ARRAY['domestic_violence','sexual_assault','other'],
    true, false
  ),
  (
    'Legal Aid Chicago',
    'Free civil legal services for low-income people in Cook County. Practice areas include domestic violence orders of protection, housing, family law, and consumer issues.',
    'legal_aid', 'cook_county',
    '312-341-1070',
    'https://www.legalaidchicago.org',
    ARRAY['en','es'],
    'Mon-Fri, 9am-4pm CT',
    'Income eligibility applies; Cook County residents.',
    ARRAY['domestic_violence','other'],
    true, false
  ),
  (
    'Metropolitan Family Services',
    'Comprehensive social services across the Chicago metro area — counseling, legal aid, youth services, and trauma-informed care for crime victims.',
    'counseling', 'chicago',
    '312-986-4000',
    'https://www.metrofamily.org',
    ARRAY['en','es'],
    'Mon-Fri, 9am-5pm CT',
    'Sliding-scale fees. Multiple service centers across Chicago.',
    ARRAY['domestic_violence','sexual_assault','homicide','community_violence'],
    true, false
  ),
  (
    'Crisis Text Line',
    'Free, 24/7 text-based crisis support. Text HOME to 741741 from anywhere in the US to connect with a trained crisis counselor.',
    'hotline', 'national',
    NULL,
    'https://www.crisistextline.org',
    ARRAY['en','es'],
    '24/7',
    'Open to anyone in crisis.',
    ARRAY['domestic_violence','sexual_assault','homicide','community_violence','other'],
    true, false
  ),
  (
    '988 Suicide and Crisis Lifeline',
    'National 24/7 hotline for mental health crises, suicide prevention, and emotional support. Call or text 988.',
    'hotline', 'national',
    '988',
    'https://988lifeline.org',
    ARRAY['en','es'],
    '24/7',
    'Open to anyone in the US experiencing mental health crisis.',
    ARRAY['domestic_violence','sexual_assault','homicide','community_violence','other'],
    true, false
  ),
  (
    'National Domestic Violence Hotline',
    '24/7 confidential support for anyone affected by domestic violence. Safety planning, referrals to local shelters and programs, and chat-based option.',
    'hotline', 'national',
    '1-800-799-7233',
    'https://www.thehotline.org',
    ARRAY['en','es'],
    '24/7',
    'Anyone experiencing or concerned about domestic violence.',
    ARRAY['domestic_violence'],
    true, false
  ),
  (
    'RAINN National Sexual Assault Hotline',
    '24/7 hotline for survivors of sexual assault. Operated by the Rape, Abuse & Incest National Network.',
    'hotline', 'national',
    '1-800-656-4673',
    'https://www.rainn.org',
    ARRAY['en','es'],
    '24/7',
    'Open to any survivor of sexual assault.',
    ARRAY['sexual_assault'],
    true, false
  ),
  (
    'Chicago Survivors',
    'Trauma support and case management for families of homicide victims in Chicago. Crisis response, grief counseling, and advocacy.',
    'counseling', 'chicago',
    '773-962-3911',
    'https://chicagosurvivors.org',
    ARRAY['en','es'],
    'Mon-Fri, 9am-5pm CT; crisis response available 24/7',
    'Families impacted by homicide in Chicago.',
    ARRAY['homicide'],
    true, false
  ),
  (
    'Illinois Coalition Against Domestic Violence',
    'Statewide network of DV service providers. Referrals, advocacy, training, and policy. Operates the Illinois Domestic Violence Hotline.',
    'legal_aid', 'illinois',
    '217-789-2830',
    'https://www.ilcadv.org',
    ARRAY['en','es'],
    'Mon-Fri business hours',
    'DV survivors and advocates throughout Illinois.',
    ARRAY['domestic_violence'],
    true, false
  ),
  (
    'Illinois Coalition Against Sexual Assault',
    'Statewide coalition of sexual assault service providers. Referrals to local rape crisis centers, advocacy, and training.',
    'counseling', 'illinois',
    '217-753-4117',
    'https://www.icasa.org',
    ARRAY['en','es'],
    'Mon-Fri business hours; member centers offer 24/7 hotlines',
    'Sexual assault survivors and advocates throughout Illinois.',
    ARRAY['sexual_assault'],
    true, false
  )
ON CONFLICT DO NOTHING;
