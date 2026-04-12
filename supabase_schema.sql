-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    source TEXT,
    year_added INTEGER,
    product_interest TEXT,
    remarks TEXT,
    tags TEXT[] DEFAULT '{}',
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, phone)
);

-- Indexes for performance on 100k+ rows
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON public.contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_product_interest ON public.contacts(product_interest);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    instance TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    target_tag TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    media_url TEXT,
    media_name TEXT,
    media_type TEXT,
    stats JSONB DEFAULT '{"sent": 0, "delivered": 0, "failed": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_contacts table for relation tracking
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    PRIMARY KEY (campaign_id, contact_id)
);

-- Setup Storage for Campaigns
INSERT INTO storage.buckets (id, name, public) VALUES ('campaigns', 'campaigns', true) ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own campaign_contacts" ON public.campaign_contacts FOR SELECT USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert their own campaign_contacts" ON public.campaign_contacts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update their own campaign_contacts" ON public.campaign_contacts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete their own campaign_contacts" ON public.campaign_contacts FOR DELETE USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));

-- RPC Functions
CREATE OR REPLACE FUNCTION get_distinct_sources(uid UUID)
RETURNS TEXT[] LANGUAGE sql STABLE AS $$
  SELECT ARRAY(SELECT DISTINCT source FROM public.contacts WHERE user_id = uid AND source IS NOT NULL ORDER BY source);
$$;

CREATE OR REPLACE FUNCTION get_distinct_tags(uid UUID)
RETURNS TEXT[] LANGUAGE sql STABLE AS $$
  SELECT ARRAY(SELECT DISTINCT unnest(tags) AS tag FROM public.contacts WHERE user_id = uid ORDER BY tag);
$$;

CREATE OR REPLACE FUNCTION add_tag_to_contacts(contact_ids UUID[], tag TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.contacts SET tags = array_append(tags, tag)
  WHERE id = ANY(contact_ids) AND NOT (tags @> ARRAY[tag]);
$$;
