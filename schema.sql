--
-- PostgreSQL database dump
--

\restrict 9TTWi87SKm3R8UQQNEaDIp7dqUdLebQX9MBHfyhQX8VIvX08BDhBpxZssfIspaH

-- Dumped from database version 19.0
-- Dumped by pg_dump version 19.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    min_delay_seconds integer DEFAULT 60,
    hourly_limit integer DEFAULT 100,
    status character varying(30) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_campaign_hourly_limit CHECK ((hourly_limit > 0)),
    CONSTRAINT check_campaign_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'scheduled'::character varying, 'running'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT check_min_delay CHECK ((min_delay_seconds >= 0))
);


--
-- Name: emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    recipient character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    error_message text,
    idempotency_key character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_email_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'queued'::character varying, 'sending'::character varying, 'sent'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: senders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.senders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    hourly_limit integer DEFAULT 50,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    smtp_host character varying(255) DEFAULT 'smtp.ethereal.email'::character varying,
    smtp_port integer DEFAULT 587,
    smtp_user character varying(255),
    smtp_password text,
    smtp_secure boolean DEFAULT false,
    last_send_completed_at timestamp with time zone,
    CONSTRAINT check_hourly_limit CHECK ((hourly_limit > 0))
);


--
-- Name: slack_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slack_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    team_id character varying(255),
    team_name character varying(255),
    access_token text NOT NULL,
    bot_user_id character varying(255),
    channel_id character varying(255),
    is_active boolean DEFAULT true,
    connected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    google_id character varying(255),
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    avatar text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: emails emails_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: senders senders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.senders
    ADD CONSTRAINT senders_pkey PRIMARY KEY (id);


--
-- Name: user_sessions session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: slack_integrations slack_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slack_integrations
    ADD CONSTRAINT slack_integrations_pkey PRIMARY KEY (id);


--
-- Name: senders unique_user_sender; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.senders
    ADD CONSTRAINT unique_user_sender UNIQUE (user_id, email);


--
-- Name: slack_integrations unique_user_slack_team; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slack_integrations
    ADD CONSTRAINT unique_user_slack_team UNIQUE (user_id, team_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.user_sessions USING btree (expire);


--
-- Name: campaigns fk_campaign_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT fk_campaign_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: emails fk_email_campaign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT fk_email_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: emails fk_email_sender; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT fk_email_sender FOREIGN KEY (sender_id) REFERENCES public.senders(id);


--
-- Name: senders fk_sender_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.senders
    ADD CONSTRAINT fk_sender_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: slack_integrations fk_slack_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slack_integrations
    ADD CONSTRAINT fk_slack_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 9TTWi87SKm3R8UQQNEaDIp7dqUdLebQX9MBHfyhQX8VIvX08BDhBpxZssfIspaH

