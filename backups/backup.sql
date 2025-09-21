--
-- PostgreSQL database dump
--

\restrict fYUx0zGGxpjeJgcywFKdgIXst8fhCJOxaGeMqzhmO2PbcAQgii72XNzlbzp8tyV

-- Dumped from database version 16.9 (63f4182)
-- Dumped by pg_dump version 17.6

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

--
-- Name: action_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.action_type AS ENUM (
    'create',
    'update',
    'delete',
    'upload',
    'login',
    'logout',
    'import',
    'export'
);


ALTER TYPE public.action_type OWNER TO postgres;

--
-- Name: client_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.client_type AS ENUM (
    'client',
    'provider',
    'both'
);


ALTER TYPE public.client_type OWNER TO postgres;

--
-- Name: currency_position; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.currency_position AS ENUM (
    'before',
    'after'
);


ALTER TYPE public.currency_position OWNER TO postgres;

--
-- Name: decimal_separator; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.decimal_separator AS ENUM (
    ',',
    '.'
);


ALTER TYPE public.decimal_separator OWNER TO postgres;

--
-- Name: fiscal_period; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.fiscal_period AS ENUM (
    'calendar',
    'may_april'
);


ALTER TYPE public.fiscal_period OWNER TO postgres;

--
-- Name: invoice_class; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_class AS ENUM (
    'A',
    'B',
    'C'
);


ALTER TYPE public.invoice_class OWNER TO postgres;

--
-- Name: invoice_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_type AS ENUM (
    'income',
    'expense',
    'neutral'
);


ALTER TYPE public.invoice_type OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'overdue',
    'cancelled'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- Name: review_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.review_status AS ENUM (
    'approved',
    'pending_review',
    'draft'
);


ALTER TYPE public.review_status OWNER TO postgres;

--
-- Name: rounding_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rounding_mode AS ENUM (
    'round',
    'ceil',
    'floor'
);


ALTER TYPE public.rounding_mode OWNER TO postgres;

--
-- Name: thousand_separator; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.thousand_separator AS ENUM (
    '.',
    ',',
    ' ',
    'none'
);


ALTER TYPE public.thousand_separator OWNER TO postgres;

--
-- Name: upload_job_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.upload_job_status AS ENUM (
    'queued',
    'processing',
    'success',
    'duplicate',
    'error'
);


ALTER TYPE public.upload_job_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'editor',
    'viewer'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    user_name text NOT NULL,
    action_type public.action_type NOT NULL,
    entity_type text NOT NULL,
    entity_id character varying,
    description text NOT NULL,
    metadata text,
    ip_address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: ai_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_feedback (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    user_id character varying NOT NULL,
    original_data text NOT NULL,
    corrected_data text NOT NULL,
    feedback_type text NOT NULL,
    confidence numeric(5,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_feedback OWNER TO postgres;

--
-- Name: clients_providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients_providers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    cuit text,
    type public.client_type NOT NULL,
    email text,
    phone text,
    address text,
    total_operations numeric(15,2) DEFAULT '0'::numeric,
    last_invoice_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clients_providers OWNER TO postgres;

--
-- Name: deleted_invoices_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deleted_invoices_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    original_invoice_id character varying NOT NULL,
    type public.invoice_type NOT NULL,
    invoice_number text,
    date timestamp without time zone,
    client_provider_name text NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    iva_amount numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    uploaded_by_name text NOT NULL,
    deleted_by character varying NOT NULL,
    deleted_by_name text NOT NULL,
    deleted_at timestamp without time zone DEFAULT now() NOT NULL,
    original_data text NOT NULL,
    invoice_class public.invoice_class DEFAULT 'A'::public.invoice_class NOT NULL,
    description text
);


ALTER TABLE public.deleted_invoices_log OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type public.invoice_type NOT NULL,
    invoice_number text,
    date timestamp without time zone,
    client_provider_id character varying,
    client_provider_name text NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    iva_amount numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    uploaded_by character varying NOT NULL,
    uploaded_by_name text NOT NULL,
    file_path text,
    file_name text,
    extracted_data text,
    processed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    file_size integer,
    owner_id character varying,
    owner_name text,
    invoice_class public.invoice_class DEFAULT 'A'::public.invoice_class NOT NULL,
    iibb_amount numeric(15,2) DEFAULT 0,
    ganancias_amount numeric(15,2) DEFAULT 0,
    other_taxes numeric(15,2) DEFAULT 0,
    payment_status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    payment_date timestamp without time zone,
    due_date timestamp without time zone,
    fingerprint text,
    needs_review boolean DEFAULT false,
    extraction_confidence numeric(5,2) DEFAULT 95.0,
    ai_extracted boolean DEFAULT false,
    review_status public.review_status DEFAULT 'approved'::public.review_status NOT NULL,
    description text
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: iva_components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.iva_components (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    description text NOT NULL,
    percentage numeric(5,2) NOT NULL,
    amount numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.iva_components OWNER TO postgres;

--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: upload_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.upload_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    fingerprint text NOT NULL,
    status public.upload_job_status DEFAULT 'queued'::public.upload_job_status NOT NULL,
    invoice_id character varying,
    error text,
    file_path text NOT NULL,
    uploaded_by_name text,
    owner_name text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    last_retry_at timestamp without time zone,
    quarantined_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.upload_jobs OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    role public.user_role DEFAULT 'viewer'::public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    avatar text,
    fiscal_period public.fiscal_period DEFAULT 'calendar'::public.fiscal_period NOT NULL,
    decimal_separator public.decimal_separator DEFAULT ','::public.decimal_separator NOT NULL,
    thousand_separator public.thousand_separator DEFAULT '.'::public.thousand_separator NOT NULL,
    decimal_places integer DEFAULT 2 NOT NULL,
    currency_symbol text DEFAULT '$'::text NOT NULL,
    currency_position public.currency_position DEFAULT 'before'::public.currency_position NOT NULL,
    rounding_mode public.rounding_mode DEFAULT 'round'::public.rounding_mode NOT NULL,
    company_logo text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, user_id, user_name, action_type, entity_type, entity_id, description, metadata, ip_address, created_at) FROM stdin;
08447ce0-ad14-45a0-8e1c-c2d16366a6b1	user-test	Franco Nicolás Corts Romeo	login	user	user-test	Failed login attempt for cortsfranco@hotmail.com	{"email":"cortsfranco@hotmail.com","success":false}	172.31.92.34	2025-09-19 04:21:09.236782
af8ab2a8-15e2-4797-a5cb-41d11749455d	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.92.34	2025-09-19 04:23:42.12183
32367b2a-5e7b-48ed-a4bd-f3650a93536f	user-test	Franco Nicolás Corts Romeo	login	user	user-test	Failed login attempt for cortsfranco@hotmail.com	{"email":"cortsfranco@hotmail.com","success":false}	172.31.92.34	2025-09-19 04:24:19.542332
63707ab7-d605-4bbe-9f88-7b44bec326b1	user-test	Franco Nicolás Corts Romeo	login	user	user-test	Failed login attempt for cortsfranco@hotmail.com	{"email":"cortsfranco@hotmail.com","success":false}	172.31.92.34	2025-09-19 04:28:36.479331
fd715ac1-b571-4e34-bf8a-a364a7565f3a	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.92.34	2025-09-19 04:30:22.124294
9401c5d3-894f-4759-8a9b-04410914fac5	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.92.34	2025-09-19 04:30:25.143638
4c0e0a21-2d29-446c-92bc-83a91da96c6c	user-test	Franco Nicolás Corts Romeo	delete	invoice	bb79b8d6-8058-451b-b356-f56b6a49e901	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 04:39:55.823472
5b1afa0e-d43d-4acb-8a81-5f0591fa652f	user-test	Franco Nicolás Corts Romeo	delete	invoice	8db987d3-6dd8-4439-bd88-4758024776f2	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 04:39:56.306743
3bcadeb3-df3d-4576-b07c-1a3a89646196	user-test	Franco Nicolás Corts Romeo	delete	invoice	36a730c6-ccf3-4373-be93-77b74a893713	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 04:39:56.724695
dbc564e3-98d0-43fd-9f1e-35862c30b202	user-test	Franco Nicolás Corts Romeo	delete	invoice	1abab125-e6d6-411b-8625-cf33831e2b65	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 04:39:57.073355
7f82404b-2dcc-4b6a-bf7d-20bd9d75d41e	user-test	Franco Nicolás Corts Romeo	delete	invoice	b74cd0cc-fad8-4c14-a606-6c485f7afbe5	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 04:39:57.411461
6b18a1f9-861d-4d4e-b19a-01b09627ab3b	user-test	Franco Nicolás Corts Romeo	delete	invoice	2a8b35f9-80c0-429b-9dd7-83ee44c5ef8d	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 04:39:57.743142
e4c7d1bf-95f3-483b-9037-c3420b8f9b62	user-test	Franco Nicolás Corts Romeo	delete	user	temp-user-id	Eliminó usuario Usuario Test	{"deletedUser":"test@test.com"}	172.31.92.34	2025-09-19 05:18:19.947866
bd13c99b-6c1e-46ed-8aed-89a6384219e9	user-test	Franco Nicolás Corts Romeo	upload	invoice	bea52032-53a8-42a9-8b85-fcbc83515b8f	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 05:39:24.365101
eb51064a-9b24-4112-afda-8cad416fae7d	user-test	Franco Nicolás Corts Romeo	upload	invoice	3e6f0f1e-5c91-4687-9915-45d22fd039ba	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 05:39:36.532081
8223d171-727c-4703-a68f-e108400165f8	user-test	Franco Nicolás Corts Romeo	delete	invoice	bea52032-53a8-42a9-8b85-fcbc83515b8f	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 05:41:20.065743
7b22dc56-d6f6-4765-8396-f7cbc7838c01	user-test	Franco Nicolás Corts Romeo	delete	invoice	3e6f0f1e-5c91-4687-9915-45d22fd039ba	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 05:41:22.418012
cbb9ee2f-9707-4783-be5e-1b7286d2cf3f	user-test	Franco Nicolás Corts Romeo	upload	invoice	a52e3dc9-9339-4a77-8eb4-e21b0a6d8379	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 05:42:15.830596
a3594b5d-8e8a-43b6-b416-8a13ab50402a	user-test	Franco Nicolás Corts Romeo	upload	invoice	319742cb-c51a-458f-b858-7e2884466e5c	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 05:47:52.141383
66047f3c-094b-4d25-ac82-4bb16ec97303	user-test	Franco Nicolás Corts Romeo	upload	invoice	6a0115b9-eb53-4f90-abab-86e87c3d0057	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 05:48:04.166118
a7be4f7a-f93d-4178-9326-0ddfc400de28	user-test	Franco Nicolás Corts Romeo	delete	invoice	a52e3dc9-9339-4a77-8eb4-e21b0a6d8379	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 05:48:21.737712
4e746716-5ad8-47d2-a3b7-a2e652bcde09	user-test	Franco Nicolás Corts Romeo	delete	invoice	6a0115b9-eb53-4f90-abab-86e87c3d0057	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 05:48:22.205531
7aefa7d5-7988-4473-966e-c37f16d3d840	user-test	Franco Nicolás Corts Romeo	delete	invoice	319742cb-c51a-458f-b858-7e2884466e5c	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 05:48:22.593496
ff6fee99-095d-4ba1-bbfe-012006e37129	user-test	Franco Nicolás Corts Romeo	upload	invoice	61bc1f45-96fb-4547-8ecf-42e269511d71	Cargó factura 0013-08888490 por 27700.53 (procesada con IA)	{"invoiceType":"expense","fileName":"4Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 05:48:53.675618
55b9cd22-b7f1-4aae-ad39-1d2f304207f3	user-test	Franco Nicolás Corts Romeo	upload	invoice	2855303b-b34b-4428-ab73-ed7f01014072	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 05:48:58.652514
ba1d9c0e-656b-44c4-8cda-4ac01cbaffba	user-test	Franco Nicolás Corts Romeo	upload	invoice	d6319a88-40c9-43e0-b1e4-4acc416dd4c5	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 05:49:20.307659
3f4718e0-779b-4daf-acb6-959c85102a33	user-test	Franco Nicolás Corts Romeo	upload	invoice	c1bf9541-9c55-4fa1-b7d9-8e184af485b5	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 05:49:48.244634
b444a699-e54e-415e-89fe-6f976c25f414	user-test	Franco Nicolás Corts Romeo	upload	invoice	8930b689-dc95-46f5-a666-bc89cb2d038d	Cargó factura 00026-00051500 por 58999.01 (procesada con IA)	{"invoiceType":"expense","fileName":"5Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 05:50:15.514833
4538e866-e60b-450d-9787-85c2ca0486a7	user-test	Franco Nicolás Corts Romeo	upload	invoice	e9311ae6-22b3-4973-a8ce-69c4c7b2232e	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"expense","fileName":"2Emitidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 05:57:13.930765
9bd3fecb-b137-4533-bbce-72d87f410673	user-test	Franco Nicolás Corts Romeo	upload	invoice	16937ea0-6ce2-4f13-bb22-d3d791ab650d	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Emitidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 05:59:41.832136
7413bab2-3c45-483d-8b47-db33d47c6eac	user-test	Franco Nicolás Corts Romeo	upload	invoice	f9f8d3d7-481b-40f4-b38f-f2869d86bd3c	Cargó factura INV-1758262004757 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"2Emitidas - copia.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 06:06:44.957656
53d2a1ab-dac8-4214-ad61-6125e650263a	user-test	Franco Nicolás Corts Romeo	delete	invoice	61bc1f45-96fb-4547-8ecf-42e269511d71	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 06:13:34.866052
ff1bb920-e128-4971-a72e-26c10c48e823	user-test	Franco Nicolás Corts Romeo	delete	invoice	f9f8d3d7-481b-40f4-b38f-f2869d86bd3c	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 06:13:35.365033
5f2eef69-b002-4cf0-8fe6-6e7880ec784e	user-test	Franco Nicolás Corts Romeo	delete	invoice	2855303b-b34b-4428-ab73-ed7f01014072	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 06:13:35.789372
da24c054-e3f9-4ad0-a44c-5101d3e25ee7	user-test	Franco Nicolás Corts Romeo	delete	invoice	c1bf9541-9c55-4fa1-b7d9-8e184af485b5	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 06:13:36.111959
9009855a-2b9b-4f4c-a60b-bed40a363341	user-test	Franco Nicolás Corts Romeo	delete	invoice	d6319a88-40c9-43e0-b1e4-4acc416dd4c5	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 06:13:36.440748
6177fc58-3ddb-4ffd-8854-e97733f04065	user-test	Franco Nicolás Corts Romeo	delete	invoice	8930b689-dc95-46f5-a666-bc89cb2d038d	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 06:13:36.767218
2bb8f698-5247-4235-85fc-bc3b5614707a	user-test	Franco Nicolás Corts Romeo	delete	invoice	e9311ae6-22b3-4973-a8ce-69c4c7b2232e	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 06:13:37.105496
b05ca656-aed9-463b-b07e-b839622f4e89	user-test	Franco Nicolás Corts Romeo	delete	invoice	16937ea0-6ce2-4f13-bb22-d3d791ab650d	Eliminó factura y la movió a la papelera	\N	172.31.92.34	2025-09-19 06:13:37.433105
1a6f5f97-1584-4c12-a943-5db48b536e69	user-test	Franco Nicolás Corts Romeo	upload	invoice	4168e77d-52ff-46fb-a38a-82d14b114653	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"income","fileName":"1Emitidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 06:14:15.810111
dbcfe0ff-80de-489b-acf9-961582719a4d	user-test	Franco Nicolás Corts Romeo	upload	invoice	2d3e8db2-3b2b-4b5d-9810-8e067d65e7e2	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"income","fileName":"2Emitidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 06:14:22.406361
1938f786-3d1c-44c8-80a6-1416787df1a9	user-test	Franco Nicolás Corts Romeo	upload	invoice	2c78ab5c-1d69-4bfa-b8e2-4c71abc9e024	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 06:15:27.913782
31bcc83d-9a54-4e03-8001-53e1bf933aff	user-test	Franco Nicolás Corts Romeo	upload	invoice	73f0c354-0f9d-4bb8-b3dc-c595bf26242c	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 06:15:34.401021
b7c8e2fc-25f5-4b7b-aa7e-a4190b7e8db8	user-test	Franco Nicolás Corts Romeo	upload	invoice	fbf8e1bf-cf1b-43d3-996e-78ee249ec9f8	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true}	172.31.92.34	2025-09-19 06:15:40.923477
db856bb5-8ae4-49ec-b908-3be5b0e24a49	user-test	Franco Nicolás Corts Romeo	upload	invoice	59756dd0-8a99-403b-afad-a2f98926d378	Cargó factura 0004-00036078 por 81083.76 (procesada con IA)	{"invoiceType":"expense","fileName":"13Recibidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 06:15:47.697646
fec27f85-030f-4d46-9ec5-0b2452691215	user-test	Franco Nicolás Corts Romeo	upload	invoice	24663092-d1a1-4db7-99a5-977838556a8a	Cargó factura 0100-00104041 por 256301.37 (procesada con IA)	{"invoiceType":"expense","fileName":"14Recibidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 06:15:54.051453
82d61e74-fcb6-48c4-b0ae-a5f89cfb98ef	user-test	Franco Nicolás Corts Romeo	upload	invoice	535f4daf-2d83-4ca7-9ee2-c60f44bb42be	Cargó factura 5320742646 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"15Recibidas.pdf","aiProcessed":true}	172.31.92.34	2025-09-19 06:16:33.840969
87a5ac9d-61aa-477a-8fd8-ae4167b0885e	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.106.130	2025-09-19 16:19:22.857848
25b52a5c-0c6c-4ba9-a159-264c2ab00214	user-test	Franco Nicolás Corts Romeo	logout	user	user-test	User Franco Nicolás Corts Romeo logged out	{"email":"cortsfranco@hotmail.com"}	172.31.106.130	2025-09-19 16:41:42.282859
a8d41d3f-0cfc-4330-8324-a6af0d570dc8	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.106.130	2025-09-19 16:41:51.967016
c37a6774-095e-41a8-b629-adbbb12d4aa0	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.116.2	2025-09-19 17:08:00.987782
f35cd895-c6d1-4b44-bf99-8a1f677f1124	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.116.2	2025-09-19 17:08:44.240751
2668ad61-7b99-4137-8b30-0f464a4b98b4	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.71.162	2025-09-19 22:10:14.287399
1b5105fb-e94f-4e67-99d6-0156cfe82630	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.98.162	2025-09-20 00:15:54.046152
521aed06-9a93-434e-aef4-9fa5d1bda777	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.98.162	2025-09-20 00:18:05.583237
9aa332f1-723e-426f-9910-c6c520e5d1a0	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.98.162	2025-09-20 00:23:37.41705
bb4015b5-19a5-4902-93a9-0442811b2c4b	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.98.162	2025-09-20 00:43:28.938925
1b0350e0-6f0c-4ca0-8ffc-71ac8ea8d55d	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.98.162	2025-09-20 00:54:58.136973
dc834d21-2bff-4d14-aa33-70e07b594caa	user-test	Franco Nicolás Corts Romeo	upload	invoice	61cac8a7-c60c-41dc-9f9e-bc8b7d3cce8d	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"income","fileName":"1Emitidas.pdf","aiProcessed":true}	172.31.68.34	2025-09-20 08:41:21.371446
cca85068-a2a1-4094-9746-cfffceb472c3	user-test	Franco Nicolás Corts Romeo	upload	invoice	282987e0-f952-465f-98be-331148253bc7	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"income","fileName":"2Emitidas.pdf","aiProcessed":true}	172.31.68.34	2025-09-20 08:41:43.925245
b1130e59-4290-471b-978e-e54dd397fe39	user-test	Franco Nicolás Corts Romeo	upload	invoice	7b426420-b173-40bf-845b-1ddbf54c6cb6	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true}	172.31.68.34	2025-09-20 08:43:49.0863
d08d6207-db49-48fe-bd02-23730a553330	user-test	Franco Nicolás Corts Romeo	upload	invoice	142540d1-7652-4a71-a680-148848fd3e88	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:43:54.58311
b6b737d7-9d17-4681-a2f4-a318d847d207	user-test	Franco Nicolás Corts Romeo	upload	invoice	dbfa6fac-051c-4da3-8882-0b357a159a01	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:43:54.825591
8d9a0141-c8fb-4d75-92d9-01b70e0792da	user-test	Franco Nicolás Corts Romeo	upload	invoice	bd497e99-3da1-400c-8291-4fa1a80c48dc	Cargó factura 0013-08888490 por 27700.53 (procesada con IA)	{"invoiceType":"expense","fileName":"4Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:43:55.031194
6bb34126-b099-4c29-a5db-6eaf7d40bda3	user-test	Franco Nicolás Corts Romeo	upload	invoice	c00c7146-003e-48ff-b850-f721529fe8d6	Cargó factura 00026-00051500 por 58999.01 (procesada con IA)	{"invoiceType":"expense","fileName":"5Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:44:44.516573
3ec56679-a134-448e-979f-08f5a6e82a16	user-test	Franco Nicolás Corts Romeo	upload	invoice	72829af7-43cf-4e37-8451-1eed8e702c6c	Cargó factura 00000082 por 52700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"6Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:44:44.708076
03ec897d-e0b1-45c8-a7ec-4acd161e4d39	user-test	Franco Nicolás Corts Romeo	upload	invoice	8d14cffb-d9db-43a0-a5c3-a2ca6bcbef88	Cargó factura 00026-00051698 por 40499.17 (procesada con IA)	{"invoiceType":"expense","fileName":"7Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:44:49.984235
472e9aa0-152c-4d28-aa28-9a7129072e83	user-test	Franco Nicolás Corts Romeo	upload	invoice	1f03e80c-568a-4050-8077-c503d58ef008	Cargó factura 00000013 por 27700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"8Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:45:37.985475
313cf3e0-26d3-4aec-a71e-2f9822dfbd81	user-test	Franco Nicolás Corts Romeo	upload	invoice	ed5d30b3-b82e-4e1c-88da-4163b6eb3e5b	Cargó factura 00019-00003745 por 347000.00 (procesada con IA)	{"invoiceType":"expense","fileName":"9Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:45:38.104074
622a9548-6b2b-4abd-8501-0387d9235b5e	user-test	Franco Nicolás Corts Romeo	upload	invoice	14337cfd-81dc-4769-90bd-01168d2db082	Cargó factura 00230-00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"10Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:45:43.04128
13dc7c02-a7d1-492d-8113-3acd8376271f	user-test	Franco Nicolás Corts Romeo	upload	invoice	40463542-8b56-4ec1-b68d-d59282c74593	Cargó factura 00225-00067530 por 50000.06 (procesada con IA)	{"invoiceType":"expense","fileName":"12Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:47:26.539665
f59fa061-5cb3-43f0-8a32-fd333f93396e	user-test	Franco Nicolás Corts Romeo	upload	invoice	059b0442-2c1a-4425-b1a1-bc9f6244b13a	Cargó factura 00230 00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"11Recibidas.jpg","aiProcessed":true}	172.31.68.34	2025-09-20 08:47:26.712753
2ea2f88f-a395-473e-bfdc-3b0059d930d0	user-test	Franco Nicolás Corts Romeo	upload	invoice	3d48fb22-f438-4ef1-b47a-e1cbf85cf056	Cargó factura 0004-00036078 por 81083.76 (procesada con IA)	{"invoiceType":"expense","fileName":"13Recibidas.pdf","aiProcessed":true}	172.31.68.34	2025-09-20 08:47:27.056577
93d934b4-36a6-43ee-99a7-c61e750a2583	user-test	Franco Nicolás Corts Romeo	upload	invoice	0f36e505-85ca-42ff-8da7-83de2e27f4b6	Cargó factura 0100-00104041 por 256301.37 (procesada con IA)	{"invoiceType":"expense","fileName":"14Recibidas.pdf","aiProcessed":true}	172.31.68.34	2025-09-20 08:48:16.697501
d6d0614f-16aa-4ee3-8ef6-175df20f9f82	user-test	Franco Nicolás Corts Romeo	upload	invoice	185adce4-2291-4f90-a074-60fac0288293	Cargó factura 5320742646 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"15Recibidas.pdf","aiProcessed":true}	172.31.68.34	2025-09-20 08:48:16.83267
fbf8dcd1-3dc3-4346-9047-ef773fa17425	user-test	Franco Nicolás Corts Romeo	upload	invoice	ff50fe1d-597a-485b-9f44-df6a9b69d983	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 09:23:45.352112
90b30f22-095a-4ef3-9424-194f8318b287	user-test	Franco Nicolás Corts Romeo	upload	invoice	31ad38d4-3232-4e34-8934-bda37873d91b	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:23:50.997567
7311f8aa-f754-4032-9894-5b5bdd3a3e38	user-test	Franco Nicolás Corts Romeo	upload	invoice	0c504540-de49-4e59-8a94-b49076276463	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:23:51.114027
a65c0f22-a407-4892-8a25-8b11ef45710e	user-test	Franco Nicolás Corts Romeo	upload	invoice	78bd2104-f9c1-4708-a37a-71a058cbd8bc	Cargó factura 00026-00051500 por 58999.01 (procesada con IA)	{"invoiceType":"expense","fileName":"5Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:23:56.659734
416c9f76-a403-4b45-ba14-c17dcda9fc7d	user-test	Franco Nicolás Corts Romeo	upload	invoice	a0b15ef8-5370-4456-b900-00120b85d234	Cargó factura 0013-08888490 por 27700.53 (procesada con IA)	{"invoiceType":"expense","fileName":"4Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:24:35.905283
2d29310e-6b5c-4d00-b2cd-e755662ff222	user-test	Franco Nicolás Corts Romeo	upload	invoice	e50b5409-c509-4d57-9c33-78bb54cac62e	Cargó factura 00000082 por 52700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"6Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:24:46.47591
3cb20c83-031c-499c-8b32-258126ec2780	user-test	Franco Nicolás Corts Romeo	upload	invoice	0ea4dbad-5061-4e24-a866-cf03040c3e9f	Cargó factura 00026-00051698 por 40499.17 (procesada con IA)	{"invoiceType":"expense","fileName":"7Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:24:46.534126
244be902-3432-40f3-8c8c-d2690a9c6bad	user-test	Franco Nicolás Corts Romeo	upload	invoice	0dea0198-5277-4028-9404-92d0bf094a9a	Cargó factura 00000013 por 27700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"8Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:24:52.108793
a09c87f5-670a-48f1-84dd-1a8347326097	user-test	Franco Nicolás Corts Romeo	upload	invoice	935a796f-5df1-4a05-9d96-678eb8515453	Cargó factura 00019-00003745 por 347000.00 (procesada con IA)	{"invoiceType":"expense","fileName":"9Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:24:57.201756
d16bbf89-057b-4e59-9f41-5967c3a52df5	user-test	Franco Nicolás Corts Romeo	upload	invoice	e5f805c7-0300-48f6-be45-3a72719f236d	Cargó factura 00230-00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"10Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:25:35.835082
ae2e2d19-74ef-483a-974c-df638f480e88	user-test	Franco Nicolás Corts Romeo	delete	client_provider	91e9e9cf-2dd8-4db7-8cd0-e533dfeef836	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:45.082107
598d51f5-5f92-47e8-9d8b-af9bd02d0400	user-test	Franco Nicolás Corts Romeo	upload	invoice	386aa1a9-14af-4a4c-8e10-e49f38536136	Cargó factura 00230 00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"11Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:25:35.938555
6b534cd9-2dcf-4afd-bbf0-b8316cde4a8b	user-test	Franco Nicolás Corts Romeo	upload	invoice	ffb45aaa-fb2d-4c05-8850-d90da1a3a183	Cargó factura 0004-00036078 por 81083.76 (procesada con IA)	{"invoiceType":"expense","fileName":"13Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 09:25:52.578338
c12c18ca-7cf0-4463-a2eb-0280dfab96d0	user-test	Franco Nicolás Corts Romeo	upload	invoice	aa5798ef-e082-40cb-96e1-9220d98bb330	Cargó factura 00225-00067530 por 50000.06 (procesada con IA)	{"invoiceType":"expense","fileName":"12Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 09:25:52.67465
f16cdc76-f349-49a2-900a-f38bdde4a17c	user-test	Franco Nicolás Corts Romeo	upload	invoice	546b5df5-808a-444e-8502-16998c3c1954	Cargó factura 5320742646 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"15Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 09:25:58.187895
a41f8c60-1b0e-4917-9073-aa7ba89b8ef2	user-test	Franco Nicolás Corts Romeo	upload	invoice	3f73bb52-98a8-4d5e-a34d-8809e2ce1ac3	Cargó factura 0100-00104041 por 256301.37 (procesada con IA)	{"invoiceType":"expense","fileName":"14Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 09:26:03.260993
17e6f777-1129-4075-9d43-4e7ea652c54e	user-test	Franco Nicolás Corts Romeo	upload	invoice	f92e792e-35a0-4e2b-ae4d-185651140778	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"17Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 09:26:36.868141
753f329e-40d0-4833-a44f-162191c38753	user-test	Franco Nicolás Corts Romeo	upload	invoice	c3264114-a110-4274-965b-ab9978cfd74e	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"expense","fileName":"16Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 09:26:36.885502
cdb20fe1-2dbc-44d5-bc87-9155378170d9	user-test	Franco Nicolás Corts Romeo	upload	invoice	f92e792e-35a0-4e2b-ae4d-185651140778	Intentó cargar factura duplicada: 1Emitidas - copia - copia.pdf	{"duplicate":true,"originalInvoice":"f92e792e-35a0-4e2b-ae4d-185651140778"}	\N	2025-09-20 09:26:36.941293
0c328750-a4e8-4e98-9416-685b68c10958	user-test	Franco Nicolás Corts Romeo	upload	invoice	f92e792e-35a0-4e2b-ae4d-185651140778	Intentó cargar factura duplicada: 1Emitidas.pdf	{"duplicate":true,"originalInvoice":"f92e792e-35a0-4e2b-ae4d-185651140778"}	\N	2025-09-20 09:26:36.987901
1be79187-c425-4859-93a0-076718de5f41	user-test	Franco Nicolás Corts Romeo	upload	invoice	f92e792e-35a0-4e2b-ae4d-185651140778	Intentó cargar factura duplicada: 1Emitidas - copia.pdf	{"duplicate":true,"originalInvoice":"f92e792e-35a0-4e2b-ae4d-185651140778"}	\N	2025-09-20 09:26:37.033304
8ccc8ef1-51e9-4789-ac17-62bb2c6667d0	user-test	Franco Nicolás Corts Romeo	upload	invoice	c3264114-a110-4274-965b-ab9978cfd74e	Intentó cargar factura duplicada: 2Emitidas - copia.pdf	{"duplicate":true,"originalInvoice":"c3264114-a110-4274-965b-ab9978cfd74e"}	\N	2025-09-20 09:26:37.079352
7ad1b64c-f25d-444c-a13b-9d680aa9754d	user-test	Franco Nicolás Corts Romeo	upload	invoice	f92e792e-35a0-4e2b-ae4d-185651140778	Intentó cargar factura duplicada: 1Emitidas.pdf	{"duplicate":true,"originalInvoice":"f92e792e-35a0-4e2b-ae4d-185651140778"}	\N	2025-09-20 09:27:47.549272
b8d57979-fecb-4269-8c41-df503a8bd686	user-test	Franco Nicolás Corts Romeo	delete	invoice	a0b15ef8-5370-4456-b900-00120b85d234	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:18.733423
0e2e2e07-8409-4293-a81f-4b68d9c10fbb	user-test	Franco Nicolás Corts Romeo	delete	invoice	ff50fe1d-597a-485b-9f44-df6a9b69d983	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:19.235136
e75509e5-f104-4b21-8abb-9bbd32374700	user-test	Franco Nicolás Corts Romeo	delete	invoice	0c504540-de49-4e59-8a94-b49076276463	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:19.741798
c888ec05-c44f-4985-880c-07a9bc36ed8f	user-test	Franco Nicolás Corts Romeo	delete	invoice	31ad38d4-3232-4e34-8934-bda37873d91b	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:20.110805
fcbf3abb-0cbb-452a-8052-b00eced3d909	user-test	Franco Nicolás Corts Romeo	delete	invoice	386aa1a9-14af-4a4c-8e10-e49f38536136	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:20.482129
c89414a9-1ce0-4763-bcde-5b10c4ea168b	user-test	Franco Nicolás Corts Romeo	delete	invoice	546b5df5-808a-444e-8502-16998c3c1954	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:20.840453
d512c0dc-9765-486c-934c-06d5a14aa6f2	user-test	Franco Nicolás Corts Romeo	delete	invoice	e5f805c7-0300-48f6-be45-3a72719f236d	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:21.196478
5cac0b38-95f6-4706-9193-33dd5bbed609	user-test	Franco Nicolás Corts Romeo	delete	invoice	ffb45aaa-fb2d-4c05-8850-d90da1a3a183	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:21.553279
181d7f92-8289-4d9a-8802-626c2bb96a61	user-test	Franco Nicolás Corts Romeo	delete	invoice	3f73bb52-98a8-4d5e-a34d-8809e2ce1ac3	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:21.907897
e546338b-1484-4654-a338-b06065e0a1b8	user-test	Franco Nicolás Corts Romeo	delete	invoice	935a796f-5df1-4a05-9d96-678eb8515453	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:22.261537
498ecec9-79f6-44a1-bd71-727bc57c8a7a	user-test	Franco Nicolás Corts Romeo	delete	invoice	0dea0198-5277-4028-9404-92d0bf094a9a	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:22.616595
7f7045cd-9d29-4698-aa4d-ca433ec55fff	user-test	Franco Nicolás Corts Romeo	delete	invoice	0ea4dbad-5061-4e24-a866-cf03040c3e9f	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:22.985039
832f4bdd-7d8b-45c2-812e-ea2d8b96f187	user-test	Franco Nicolás Corts Romeo	delete	invoice	e50b5409-c509-4d57-9c33-78bb54cac62e	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:23.345142
b03e7056-8b36-40a4-b9ea-0de343cde3c6	user-test	Franco Nicolás Corts Romeo	delete	invoice	78bd2104-f9c1-4708-a37a-71a058cbd8bc	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:23.702482
7544f686-b728-43e9-b291-df0f0ce1a0f5	user-test	Franco Nicolás Corts Romeo	delete	invoice	c3264114-a110-4274-965b-ab9978cfd74e	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:24.075933
bbf5fb7a-d000-458b-8bfd-e84f38ceacdd	user-test	Franco Nicolás Corts Romeo	delete	invoice	f92e792e-35a0-4e2b-ae4d-185651140778	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:24.430188
f93b31f5-3fbe-4683-8dd2-be0a498ab87b	user-test	Franco Nicolás Corts Romeo	delete	invoice	aa5798ef-e082-40cb-96e1-9220d98bb330	Eliminó factura y la movió a la papelera	\N	172.31.118.2	2025-09-20 09:44:24.795829
1030eed9-d39b-4a0a-b664-fb67f087c650	user-test	Franco Nicolás Corts Romeo	delete	client_provider	0b381d49-5899-4b6a-aef1-2ae241f52b2f	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:44.399702
00708f28-b039-4bc4-9995-a18c79c5d6ea	user-test	Franco Nicolás Corts Romeo	delete	client_provider	a1b38478-fa02-4101-b9d8-59693da3f945	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:44.812264
dc95edb6-eb08-4cca-9283-db54ffaaaa9a	user-test	Franco Nicolás Corts Romeo	delete	client_provider	e20435b9-997f-4985-a0f4-fbd3b8d0c93e	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:45.369633
c732d66f-2252-4086-91cd-28ec2bd3bfeb	user-test	Franco Nicolás Corts Romeo	delete	client_provider	46b1d565-10ad-441f-803f-2fa38bd5a476	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:46.232697
758ce71e-f042-4c88-af5c-f6124ebacf97	user-test	Franco Nicolás Corts Romeo	delete	client_provider	62a868e9-2797-4ad1-9acf-e06ab60090e8	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:46.503747
d02c8f62-6954-4f1d-abd9-c8343e8807b8	user-test	Franco Nicolás Corts Romeo	delete	client_provider	6f66d4bd-4c59-4817-99b7-a28d04a89b26	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:47.331316
073f761e-5d51-47e8-b5b7-23ba3efc5200	user-test	Franco Nicolás Corts Romeo	delete	client_provider	ee2a85c9-e9b6-4365-8daa-966f01833586	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:47.887644
f8258c16-a6f0-4de4-92d1-a92af71f876a	user-test	Franco Nicolás Corts Romeo	delete	client_provider	61061531-d73d-4e66-b188-53bb8941dbb9	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:48.158356
b8ed485c-3617-49da-93a9-cdb70c83e6de	user-test	Franco Nicolás Corts Romeo	delete	client_provider	267e2cf3-6115-485e-9369-ea87fe9ccb59	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:45.648327
a7b0284e-3e6d-48c5-8778-3fd6d7c534a1	user-test	Franco Nicolás Corts Romeo	delete	client_provider	11912587-232f-44f7-a6b4-cf4672fa7285	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:45.946281
68fedf1a-a498-44e9-b445-4aa0231feb92	user-test	Franco Nicolás Corts Romeo	delete	client_provider	854217ae-a961-4fc9-b99a-e6c00579cd49	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:46.781005
45e67f31-62b8-4e2a-8278-aeb2084bb28c	user-test	Franco Nicolás Corts Romeo	delete	client_provider	458b2674-ed97-4422-8390-b368d10a247e	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:47.052754
ffeef2fc-460c-4265-9e17-fe9554ff4d0a	user-test	Franco Nicolás Corts Romeo	delete	client_provider	2258d6b2-1aa7-4da1-94fd-49ae06f4b38b	Eliminó cliente/proveedor	\N	172.31.118.2	2025-09-20 09:44:47.60785
77c573f1-0ecb-4793-a1de-b7333864fb9c	user-test	Franco Nicolás Corts Romeo	upload	invoice	18ef3064-4ec8-4f20-a591-649fe7865c28	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"income","fileName":"1Emitidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 09:54:26.041177
f57fa1c0-0345-4e15-a764-c38e32a29751	user-test	Franco Nicolás Corts Romeo	upload	invoice	19a21ba8-060c-46bc-8bf4-9f90bf380719	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"income","fileName":"2Emitidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 09:56:41.54045
d9c88cda-8c21-4f82-945d-fd6994d8a3f6	user-test	Franco Nicolás Corts Romeo	upload	invoice	6516bd76-1746-408d-80a3-9e0abba234b6	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 10:09:07.1337
f8a5ffe1-ae46-49d0-bd11-2a9e82b4b14b	user-test	Franco Nicolás Corts Romeo	upload	invoice	c5b4226b-8062-4ff8-ba1b-1013ed863007	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:09:12.806525
f3fc76f8-d354-4f7c-b4ff-f297a5786244	user-test	Franco Nicolás Corts Romeo	upload	invoice	f6e384f4-196e-4b52-ba61-47070a67fac9	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:09:12.952063
624250c2-753d-4c02-a70c-b267944142be	user-test	Franco Nicolás Corts Romeo	upload	invoice	612c46fe-7f4a-43eb-a030-55e3cd303b26	Cargó factura 00026-00051500 por 58999.01 (procesada con IA)	{"invoiceType":"expense","fileName":"5Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:09:18.554961
11aa3f06-278d-4a7d-a71a-c83f1c50d5a4	user-test	Franco Nicolás Corts Romeo	upload	invoice	6d3a5696-319a-45ff-88c4-f745ad257a7f	Cargó factura 0013-08888490 por 27700.53 (procesada con IA)	{"invoiceType":"expense","fileName":"4Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:09:57.73643
3185e212-6a59-457c-a97e-f20a306f8c98	user-test	Franco Nicolás Corts Romeo	upload	invoice	55a4e648-229c-43e2-a7db-afaba119074f	Cargó factura 00026-00051698 por 40499.17 (procesada con IA)	{"invoiceType":"expense","fileName":"7Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:10:07.213216
dabe034f-eb02-4ddf-88b2-d56e2b50397b	user-test	Franco Nicolás Corts Romeo	upload	invoice	b9d42064-bbbd-4b66-b5ae-fc9441c14072	Cargó factura 00000082 por 52700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"6Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:10:13.399156
25629eb1-7f68-4b38-ab6c-962316f7fef8	user-test	Franco Nicolás Corts Romeo	upload	invoice	6b2a35bd-ca02-4342-9b77-deef19536050	Cargó factura 00000013 por 27700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"8Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:10:24.132131
8e8f2da3-2ef6-4eef-8612-f7c63629b979	user-test	Franco Nicolás Corts Romeo	upload	invoice	971b64f8-7982-499c-8fd9-4a69489654d8	Cargó factura 00019-00003745 por 347000.00 (procesada con IA)	{"invoiceType":"expense","fileName":"9Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:10:24.138157
591b3fb2-006d-4791-b2b4-e94283b69144	user-test	Franco Nicolás Corts Romeo	upload	invoice	507926f9-590f-43ab-b8ca-6f17b29a5813	Cargó factura 00230-00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"10Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:10:58.697744
35153786-0d9d-4b3a-ba5d-d73fd796ff25	user-test	Franco Nicolás Corts Romeo	upload	invoice	038bb899-a3b5-4c84-b25b-2a0a61c1b3e2	Cargó factura 00230 00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"11Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:10:58.828184
7cf2beed-3332-459c-b032-3621bea1672c	user-test	Franco Nicolás Corts Romeo	upload	invoice	1c599a00-dfd7-4bdd-96c0-15512e50cb2f	Cargó factura 00225-00067530 por 50000.06 (procesada con IA)	{"invoiceType":"expense","fileName":"12Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 10:11:18.499992
3491293c-5ba2-4823-a2a7-3cef65809274	user-test	Franco Nicolás Corts Romeo	upload	invoice	fc8844e8-e771-411d-a051-f16a2ca59f4b	Cargó factura 0004-00036078 por 81083.76 (procesada con IA)	{"invoiceType":"expense","fileName":"13Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 10:11:19.501603
d7037047-12fc-4f63-b68b-0c8b9036f507	user-test	Franco Nicolás Corts Romeo	upload	invoice	79b599b2-c0f0-40c8-b214-46cfdff60944	Cargó factura 0100-00104041 por 256301.37 (procesada con IA)	{"invoiceType":"expense","fileName":"14Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 10:11:25.03662
004e856f-9159-462c-b99e-b20aa1c6edae	user-test	Franco Nicolás Corts Romeo	upload	invoice	3719782e-bdc5-4b44-85fe-2129d1ba0a94	Cargó factura 5320742646 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"15Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 10:11:29.133342
a6277547-c04d-462b-a6b4-607e3e651ec4	user-test	Franco Nicolás Corts Romeo	upload	invoice	19a21ba8-060c-46bc-8bf4-9f90bf380719	Intentó cargar factura duplicada: 16Recibidas.pdf	{"duplicate":true,"originalInvoice":"19a21ba8-060c-46bc-8bf4-9f90bf380719"}	\N	2025-09-20 10:11:29.180837
72e9d063-9679-49b5-8176-4bfac8c62101	user-test	Franco Nicolás Corts Romeo	upload	invoice	18ef3064-4ec8-4f20-a591-649fe7865c28	Intentó cargar factura duplicada: 17Recibidas.pdf	{"duplicate":true,"originalInvoice":"18ef3064-4ec8-4f20-a591-649fe7865c28"}	\N	2025-09-20 10:11:29.182035
6e346958-bffd-4da6-b75d-0ba52388395b	user-test	Franco Nicolás Corts Romeo	delete	invoice	6d3a5696-319a-45ff-88c4-f745ad257a7f	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:35.705234
3a81302d-adeb-42dc-9d53-87f2a0f9386c	user-test	Franco Nicolás Corts Romeo	delete	invoice	6516bd76-1746-408d-80a3-9e0abba234b6	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:36.079106
b347e7f1-7a1b-4a56-8191-76e4bf8e31cc	user-test	Franco Nicolás Corts Romeo	delete	invoice	f6e384f4-196e-4b52-ba61-47070a67fac9	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:36.436738
1afd1a04-57cd-4194-811d-d3b663881758	user-test	Franco Nicolás Corts Romeo	delete	invoice	c5b4226b-8062-4ff8-ba1b-1013ed863007	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:36.801016
e79c3c7b-b815-4841-b101-c1ac24b37b6c	user-test	Franco Nicolás Corts Romeo	delete	invoice	038bb899-a3b5-4c84-b25b-2a0a61c1b3e2	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:37.157897
a9b2be9f-8d1e-4ba7-843f-14b2457efdf0	user-test	Franco Nicolás Corts Romeo	delete	invoice	507926f9-590f-43ab-b8ca-6f17b29a5813	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:37.55533
cef82d8b-737b-4293-9a4d-5011820e87a1	user-test	Franco Nicolás Corts Romeo	delete	invoice	3719782e-bdc5-4b44-85fe-2129d1ba0a94	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:37.917345
ca1cd457-cbcd-4edb-a99d-44f33a0a66ee	user-test	Franco Nicolás Corts Romeo	delete	invoice	fc8844e8-e771-411d-a051-f16a2ca59f4b	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:38.264949
e5afe697-a091-4893-8b6b-bba8f39dfa44	user-test	Franco Nicolás Corts Romeo	delete	invoice	79b599b2-c0f0-40c8-b214-46cfdff60944	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:38.628205
60121903-40e4-404d-9820-74cb085e97ed	user-test	Franco Nicolás Corts Romeo	delete	invoice	971b64f8-7982-499c-8fd9-4a69489654d8	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:38.994558
e1b6a436-f7ec-480d-a0c2-e3190919f933	user-test	Franco Nicolás Corts Romeo	delete	invoice	b9d42064-bbbd-4b66-b5ae-fc9441c14072	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:40.074998
d38404b9-12eb-4fa3-9a1a-c3cc5984b745	user-test	Franco Nicolás Corts Romeo	delete	invoice	1c599a00-dfd7-4bdd-96c0-15512e50cb2f	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:41.539567
163bfc8e-8ee3-42c0-b60b-e1785464b297	user-test	Franco Nicolás Corts Romeo	delete	client_provider	34eed20a-175e-44f7-a125-750646e52fe2	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:56.652871
9b9aa89d-827e-4dd5-bc3e-e2dab1888e28	user-test	Franco Nicolás Corts Romeo	delete	client_provider	ce73a32a-c4db-45aa-9931-d833b428e092	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:56.962082
17ce4313-355b-474f-922c-4c0cc1366284	user-test	Franco Nicolás Corts Romeo	delete	client_provider	bc626b06-2424-43c1-a235-d96471fa1652	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:57.259718
39eb696c-c848-4090-bf0b-89c6f54fcf39	user-test	Franco Nicolás Corts Romeo	delete	client_provider	5355dbab-4c61-4f13-aa4f-b387f2600d68	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:57.56301
86b7091a-586f-4f07-a3ea-c846b7695425	user-test	Franco Nicolás Corts Romeo	delete	client_provider	98e31857-54ca-493e-ae0b-3ac4058c8e11	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:58.81159
dbdfcc1b-ab25-4fdd-a0e4-33c2068f1bd3	user-test	Franco Nicolás Corts Romeo	delete	client_provider	caf7f577-42b4-4002-93b9-1127d8fd827a	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:59.113357
43c4084a-42e1-4b06-aa58-bbd6ecffbc86	user-test	Franco Nicolás Corts Romeo	delete	client_provider	dc57efd1-c5ee-4ec3-be18-57cff8c96d37	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:04:00.298465
8ce9315a-2d35-4099-9815-2eabe0e15689	user-test	Franco Nicolás Corts Romeo	delete	client_provider	64e65fff-93f3-4793-8d69-ff7061febb05	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:04:00.591131
bcc982fb-4082-40e0-93a3-11cc369cd86b	user-test	Franco Nicolás Corts Romeo	delete	invoice	6b2a35bd-ca02-4342-9b77-deef19536050	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:39.363065
c2c9e335-1b84-455a-b99e-83d08729bc7d	user-test	Franco Nicolás Corts Romeo	delete	invoice	55a4e648-229c-43e2-a7db-afaba119074f	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:39.724497
b01d8ac6-be44-430e-a23c-eb3c84880a73	user-test	Franco Nicolás Corts Romeo	delete	invoice	612c46fe-7f4a-43eb-a030-55e3cd303b26	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:40.445068
8c56a831-528c-404f-8111-c33360184b9d	user-test	Franco Nicolás Corts Romeo	delete	invoice	19a21ba8-060c-46bc-8bf4-9f90bf380719	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:40.815939
d18a1c02-e389-453f-984f-add92718dabc	user-test	Franco Nicolás Corts Romeo	delete	invoice	18ef3064-4ec8-4f20-a591-649fe7865c28	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:03:41.18302
7e0f77d2-3083-4af5-9b9f-c1e79760822b	user-test	Franco Nicolás Corts Romeo	delete	client_provider	b536664d-4e24-4a6a-baa6-0f578de45d22	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:57.858916
c505a298-3880-4298-a916-a18dc811cd55	user-test	Franco Nicolás Corts Romeo	delete	client_provider	57d646b8-4c8f-440a-877c-436e475c23a1	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:58.151794
dcc31516-6d3c-4929-a4c9-b7906281c6fc	user-test	Franco Nicolás Corts Romeo	delete	client_provider	6f876555-5046-4edc-8414-e31b8f66b64a	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:58.510339
1a9a4dd0-1372-435e-b65b-46d91e5ccc8d	user-test	Franco Nicolás Corts Romeo	delete	client_provider	60e6fcfe-b66f-4b8e-bbc8-f17236374e5e	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:59.415112
9980dca4-bb33-44e8-9195-90675f512dd1	user-test	Franco Nicolás Corts Romeo	delete	client_provider	4818acc4-501e-418a-940b-16d6342570f3	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:59.706505
440e9024-b7f9-407d-b9bf-761d317c1337	user-test	Franco Nicolás Corts Romeo	delete	client_provider	fe0b5ab4-8d44-4b1a-aab4-113cb79e6288	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:03:59.999752
fc32b3e1-fa23-4e8f-8a46-606f9cd122e1	user-test	Franco Nicolás Corts Romeo	upload	invoice	b1f1ea5b-f7e4-45a7-a2d9-d7e8504b0a19	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"income","fileName":"1Emitidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:04:38.911736
bc7d5eee-21ee-409d-8f3f-194fe749382d	user-test	Franco Nicolás Corts Romeo	upload	invoice	c3caf82d-03d7-4f66-b2fb-6acc962c226e	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"income","fileName":"2Emitidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:04:55.350392
d6844e1c-575b-4684-a92e-52142a951398	user-test	Franco Nicolás Corts Romeo	upload	invoice	83a02f0a-7a9d-4e7f-97d0-97574d1b695f	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:05:59.108405
b6c00f49-6b2c-4fd6-a145-63681bf34555	user-test	Franco Nicolás Corts Romeo	upload	invoice	5fe5e729-18c0-4b09-a191-67138af25416	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:06:04.771743
3144cd9c-cbf0-4e49-b6b2-86f56a232ec0	user-test	Franco Nicolás Corts Romeo	upload	invoice	2ea39e40-9a27-4b14-8ef9-a9f196a6a315	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:06:09.961144
7e9503c1-f23d-43a8-a81e-1f09991ec42c	user-test	Franco Nicolás Corts Romeo	upload	invoice	e3f199ac-9144-4409-8d5a-fece4d79ab49	Cargó factura 00026-00051500 por 58999.01 (procesada con IA)	{"invoiceType":"expense","fileName":"5Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:06:54.732408
e003771e-83e7-455a-90ae-399192832b40	user-test	Franco Nicolás Corts Romeo	upload	invoice	1471a596-521b-445f-9ff8-33f0a0586d43	Cargó factura 0013-08888490 por 27700.53 (procesada con IA)	{"invoiceType":"expense","fileName":"4Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:06:54.738784
83e32bd5-5291-48bd-a74a-f933f5aeb481	user-test	Franco Nicolás Corts Romeo	upload	invoice	8493bba0-fe3a-4cd3-b96c-3c036e49480d	Cargó factura 0100-00104041 por 256301.37 (procesada con IA)	{"invoiceType":"expense","fileName":"14Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:07:00.159558
96c00842-e84c-4970-9e90-1d59047d9c82	user-test	Franco Nicolás Corts Romeo	upload	invoice	9ca67218-492e-415c-a4b4-26f1a51abb73	Cargó factura 0004-00036078 por 81083.76 (procesada con IA)	{"invoiceType":"expense","fileName":"13Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:07:00.160793
3af7c162-82f9-4542-96be-56a60f3f5bf0	user-test	Franco Nicolás Corts Romeo	upload	invoice	c3caf82d-03d7-4f66-b2fb-6acc962c226e	Intentó cargar factura duplicada: 16Recibidas.pdf	{"duplicate":true,"originalInvoice":"c3caf82d-03d7-4f66-b2fb-6acc962c226e"}	\N	2025-09-20 15:07:00.204792
3b42d857-3b5b-4637-9f81-4b573ba16c4f	user-test	Franco Nicolás Corts Romeo	upload	invoice	2e8645ce-03e8-4903-acc2-f6774457b6ec	Cargó factura 5320742646 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"15Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:07:10.780966
355edec7-1a50-4887-90fb-616b0d5d744a	user-test	Franco Nicolás Corts Romeo	upload	invoice	10152981-bdba-4865-950c-cbb5c9a3be48	Cargó factura 00026-00051698 por 40499.17 (procesada con IA)	{"invoiceType":"expense","fileName":"7Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:07:21.406533
0acb8d13-9a9f-44b0-984e-e84f6e36a0ec	user-test	Franco Nicolás Corts Romeo	upload	invoice	02eafa57-c71c-4a25-8bfc-c29ae8fa74ed	Cargó factura 00000013 por 27700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"8Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:07:21.528163
e30dbd49-0fbe-4a4c-9f48-e6a2d6e9bae5	user-test	Franco Nicolás Corts Romeo	upload	invoice	8a0e522d-1bcc-42b8-80ab-846be642bb20	Cargó factura 00019-00003745 por 347000.00 (procesada con IA)	{"invoiceType":"expense","fileName":"9Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:08:01.089561
1d46036d-8851-41e4-b937-6ecbdba37c8f	user-test	Franco Nicolás Corts Romeo	upload	invoice	5e9bf675-31fd-40df-b05c-eb737f9f5109	Cargó factura 00230-00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"10Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:08:05.210688
c86c9065-a5a0-4c40-aed4-a08a29b6788f	user-test	Franco Nicolás Corts Romeo	upload	invoice	fafce1e9-efba-450a-b34d-8eee81fc3909	Cargó factura 00230 00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"11Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:08:11.773687
f6c91d24-08e9-40df-abd4-9ff132172904	user-test	Franco Nicolás Corts Romeo	upload	invoice	f28f6b77-5be8-4f5d-a981-4f11f182c59a	Cargó factura 00225-00067530 por 50000.06 (procesada con IA)	{"invoiceType":"expense","fileName":"12Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:08:11.790849
a8ef7a08-9e71-4487-807b-9a2baee31052	user-test	Franco Nicolás Corts Romeo	delete	client_provider	e871d352-3236-4556-9396-bda081c1005d	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:03.229706
6fe3ce3a-6952-4505-9699-8de714f38d50	user-test	Franco Nicolás Corts Romeo	upload	invoice	b1f1ea5b-f7e4-45a7-a2d9-d7e8504b0a19	Intentó cargar factura duplicada: 17Recibidas.pdf	{"duplicate":true,"originalInvoice":"b1f1ea5b-f7e4-45a7-a2d9-d7e8504b0a19"}	\N	2025-09-20 15:08:11.836733
4678d7b7-c1ce-42ea-be81-44da04f60b0e	user-test	Franco Nicolás Corts Romeo	delete	invoice	1471a596-521b-445f-9ff8-33f0a0586d43	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:18.158553
59e649d8-a56f-4844-95a4-e6f98daa1697	user-test	Franco Nicolás Corts Romeo	delete	invoice	83a02f0a-7a9d-4e7f-97d0-97574d1b695f	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:18.642778
8747d21e-d553-4113-90e5-dec4f56f0215	user-test	Franco Nicolás Corts Romeo	delete	invoice	2ea39e40-9a27-4b14-8ef9-a9f196a6a315	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:19.236705
1395c1ee-7317-42f3-aafb-cc3a67e6c540	user-test	Franco Nicolás Corts Romeo	delete	invoice	5fe5e729-18c0-4b09-a191-67138af25416	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:19.710787
6e0aecc2-ef7f-4a59-860d-564f014b82a0	user-test	Franco Nicolás Corts Romeo	delete	invoice	2e8645ce-03e8-4903-acc2-f6774457b6ec	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:20.076508
426a285a-71c3-4c69-b13c-42c2b3eae4a2	user-test	Franco Nicolás Corts Romeo	delete	invoice	5e9bf675-31fd-40df-b05c-eb737f9f5109	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:20.423071
8cc79ad3-2c54-400c-87f7-7a0e72d0a99e	user-test	Franco Nicolás Corts Romeo	delete	invoice	fafce1e9-efba-450a-b34d-8eee81fc3909	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:20.77075
eb1959b8-a84a-4d08-be11-3e7969c46295	user-test	Franco Nicolás Corts Romeo	delete	invoice	9ca67218-492e-415c-a4b4-26f1a51abb73	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:21.158864
d3b36b23-e8c2-4727-a6a3-2341b121dd6a	user-test	Franco Nicolás Corts Romeo	delete	invoice	8493bba0-fe3a-4cd3-b96c-3c036e49480d	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:21.510121
aff5d5cc-c739-4005-af31-e2ac8e882548	user-test	Franco Nicolás Corts Romeo	delete	invoice	8a0e522d-1bcc-42b8-80ab-846be642bb20	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:21.857559
ba96e188-e94e-4066-b806-f672a9d274cb	user-test	Franco Nicolás Corts Romeo	delete	invoice	02eafa57-c71c-4a25-8bfc-c29ae8fa74ed	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:22.209182
5a77398e-5daa-4e05-b612-a7e857e99494	user-test	Franco Nicolás Corts Romeo	delete	invoice	10152981-bdba-4865-950c-cbb5c9a3be48	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:22.569293
1417d59b-c16b-4073-bb0a-0e825b2f4ddc	user-test	Franco Nicolás Corts Romeo	delete	invoice	e3f199ac-9144-4409-8d5a-fece4d79ab49	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:22.936729
b2ede747-9be9-49ee-b39b-68466483f895	user-test	Franco Nicolás Corts Romeo	delete	invoice	c3caf82d-03d7-4f66-b2fb-6acc962c226e	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:23.284817
d32dd965-914f-4d43-9f83-903367289520	user-test	Franco Nicolás Corts Romeo	delete	invoice	b1f1ea5b-f7e4-45a7-a2d9-d7e8504b0a19	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:23.638707
6b524f68-6d0a-4145-826a-e2b2d94152a8	user-test	Franco Nicolás Corts Romeo	delete	invoice	f28f6b77-5be8-4f5d-a981-4f11f182c59a	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:16:23.987454
2caf118e-784e-4c28-a00e-0f547fdcf0a9	user-test	Franco Nicolás Corts Romeo	delete	client_provider	abc4b0f2-ced1-4748-995d-52f0cb8335a8	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:37.093838
7be465cb-c84c-49a0-8994-4df06851371c	user-test	Franco Nicolás Corts Romeo	delete	client_provider	e3b21dbe-7d99-44df-bc85-4da205aa8984	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:37.741015
266c9b4d-28fc-43d6-bb6e-32431113912d	user-test	Franco Nicolás Corts Romeo	delete	client_provider	8b187aa5-81f0-40a8-833b-6cc5a48d0782	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:38.030826
7cc83ad3-f158-4d11-bb70-ec60f43f3066	user-test	Franco Nicolás Corts Romeo	delete	client_provider	45bff8cc-1d40-4f1e-b58d-8c3707c6934f	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:38.32244
d6d678b2-506e-4638-adb3-13a831a4eae6	user-test	Franco Nicolás Corts Romeo	delete	client_provider	7a6ead9e-4dff-4cd0-bdb5-034320b331de	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:38.61182
b4ad3568-24b4-4e2d-b021-c9ddc1eddc60	user-test	Franco Nicolás Corts Romeo	delete	client_provider	1086233e-f707-43b8-9e5a-1bd07cfbb884	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:38.906103
cd3d0c62-ce6e-4134-a6c8-294a1e4c0d54	user-test	Franco Nicolás Corts Romeo	delete	client_provider	815b5658-7fb8-4dc2-992d-74335b2dbe5e	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:39.204463
c63314df-9934-4abc-aec8-3a9d85d2e607	user-test	Franco Nicolás Corts Romeo	delete	client_provider	1fdee7a7-3468-47a9-a4a8-8ae256236968	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:39.501772
a953cc63-949e-41d0-a829-4e9974f696cf	user-test	Franco Nicolás Corts Romeo	delete	client_provider	bf733c82-a2f3-415a-beaf-b93107f23ce9	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:39.799252
d69d6ad3-e389-4903-b17b-17190fad4d51	user-test	Franco Nicolás Corts Romeo	delete	client_provider	cc4e1097-80ca-41f5-943d-588b5afdb7d4	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:40.09467
ce85e6d7-9539-4da2-8fc1-00dc39c7df94	user-test	Franco Nicolás Corts Romeo	delete	client_provider	19738630-4ff4-417d-88e1-450dd282956e	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:40.391371
602bb7e7-3676-4e78-ba6b-e2bda1d2ed57	user-test	Franco Nicolás Corts Romeo	delete	client_provider	a6af77e6-9d1e-4f81-9d84-77b0e75d231b	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:40.687181
4aa11fbb-033c-4610-86fb-6f3e2bbb18c9	user-test	Franco Nicolás Corts Romeo	delete	client_provider	129dd183-8ef6-47b6-a04e-ba8ffce1444c	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:16:40.975269
d2bc27f2-b6c3-4467-a93e-6f91a733ebbf	user-test	Franco Nicolás Corts Romeo	upload	invoice	39f45fb3-c033-4a14-bbd2-b8a9d7e5bb98	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:20:47.768857
28ea6dab-ebff-4abc-ab24-29aace970ffc	user-test	Franco Nicolás Corts Romeo	upload	invoice	86d770ee-2e45-422c-974c-57497da4d47e	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:20:58.60856
9fe1ddb5-46fb-4ad8-a182-728673396870	user-test	Franco Nicolás Corts Romeo	upload	invoice	9654632e-9d19-4451-8f79-76f66ac5b798	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:21:03.731897
2d2bb426-a760-4c32-aaff-9526133a11de	user-test	Franco Nicolás Corts Romeo	upload	invoice	3e9a9950-3312-47d9-b6d1-af8e4c8cb590	Cargó factura 0013-08888490 por 27700.53 (procesada con IA)	{"invoiceType":"expense","fileName":"4Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:21:38.391888
10d7bc73-1b01-4a3b-9f37-90e654c928ee	user-test	Franco Nicolás Corts Romeo	upload	invoice	90eff3b4-8ff4-4589-8d73-98b280aafa80	Cargó factura 00026-00051500 por 58999.01 (procesada con IA)	{"invoiceType":"expense","fileName":"5Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:21:38.427135
3eae64a9-3bc2-4062-ae58-6e04efe49a5b	user-test	Franco Nicolás Corts Romeo	upload	invoice	39f45fb3-c033-4a14-bbd2-b8a9d7e5bb98	Intentó cargar factura duplicada: 1Recibidas.pdf	{"duplicate":true,"originalInvoice":"39f45fb3-c033-4a14-bbd2-b8a9d7e5bb98"}	\N	2025-09-20 15:21:38.483888
07bce490-38ab-4319-ab33-31b24e3b05fd	user-test	Franco Nicolás Corts Romeo	upload	invoice	9654632e-9d19-4451-8f79-76f66ac5b798	Intentó cargar factura duplicada: 3Recibidas.jpg	{"duplicate":true,"originalInvoice":"9654632e-9d19-4451-8f79-76f66ac5b798"}	\N	2025-09-20 15:21:38.533016
67595d1e-4308-4735-a052-d8abbe6d2462	user-test	Franco Nicolás Corts Romeo	upload	invoice	90eff3b4-8ff4-4589-8d73-98b280aafa80	Intentó cargar factura duplicada: 5Recibidas.jpg	{"duplicate":true,"originalInvoice":"90eff3b4-8ff4-4589-8d73-98b280aafa80"}	\N	2025-09-20 15:21:38.581786
46aaab52-1f0a-427f-a4c5-4ef374509244	user-test	Franco Nicolás Corts Romeo	upload	invoice	03ba0e3b-35d3-431c-8064-54819a76ed80	Cargó factura 00000082 por 52700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"6Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:21:53.2024
42f8e88c-e584-4002-b22f-6bc075600c4c	user-test	Franco Nicolás Corts Romeo	upload	invoice	434235f5-c88d-494b-92a6-7e3552a761bd	Cargó factura 00000013 por 27700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"8Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:21:58.905403
4be51ddb-d497-4019-866e-a3d79737d597	user-test	Franco Nicolás Corts Romeo	upload	invoice	86d770ee-2e45-422c-974c-57497da4d47e	Intentó cargar factura duplicada: 2Recibidas.jpg	{"duplicate":true,"originalInvoice":"86d770ee-2e45-422c-974c-57497da4d47e"}	\N	2025-09-20 15:21:38.481055
6a4c81dd-11bd-45e2-b7e8-cefa906e4ee6	user-test	Franco Nicolás Corts Romeo	upload	invoice	3e9a9950-3312-47d9-b6d1-af8e4c8cb590	Intentó cargar factura duplicada: 4Recibidas.jpg	{"duplicate":true,"originalInvoice":"3e9a9950-3312-47d9-b6d1-af8e4c8cb590"}	\N	2025-09-20 15:21:38.527899
4d082b6f-6a81-4172-b72d-2ba68c9ddacf	user-test	Franco Nicolás Corts Romeo	upload	invoice	d89549c6-632c-43ed-8719-829bb7cadee2	Cargó factura 00026-00051698 por 40499.17 (procesada con IA)	{"invoiceType":"expense","fileName":"7Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:21:58.804204
5e3b737a-1de2-490e-b89e-c9316a39f55f	user-test	Franco Nicolás Corts Romeo	upload	invoice	9d1ba457-208d-4f8e-92e6-2ffd5b62d713	Cargó factura 00019-00003745 por 347000.00 (procesada con IA)	{"invoiceType":"expense","fileName":"9Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:22:38.660756
311c5a40-b566-4e29-a472-e29cd1deb996	user-test	Franco Nicolás Corts Romeo	upload	invoice	86e42361-772a-43eb-9502-c816769267da	Cargó factura 00230-00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"10Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 15:22:38.716553
65eaf17d-e47f-4a49-bb5b-6439e7aa2404	user-test	Franco Nicolás Corts Romeo	upload	invoice	831f09bb-a629-47c7-8871-9d12a52fc076	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"income","fileName":"2Emitidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:22:48.229465
440c4a73-9ee9-472b-8ce0-bbceb8a97f78	user-test	Franco Nicolás Corts Romeo	upload	invoice	8b0fa390-68ab-47e7-98ca-15355de9c232	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"income","fileName":"1Emitidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:22:48.231572
533af10f-08c9-4fdc-a910-ab4707b725a8	user-test	Franco Nicolás Corts Romeo	upload	invoice	ae6387a7-880b-45df-8afa-142f14a0ba51	Cargó factura 0004-00036078 por 81083.76 (procesada con IA)	{"invoiceType":"expense","fileName":"13Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:22:59.929195
98678c07-0463-41eb-b6a6-ba319b050b42	user-test	Franco Nicolás Corts Romeo	upload	invoice	b8567ad9-325b-4025-919e-4a5ccbe95328	Cargó factura 0100-00104041 por 256301.37 (procesada con IA)	{"invoiceType":"expense","fileName":"14Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:23:04.955196
fff35fe3-ea00-4a7d-92a0-1f05e9a94269	user-test	Franco Nicolás Corts Romeo	upload	invoice	831f09bb-a629-47c7-8871-9d12a52fc076	Intentó cargar factura duplicada: 16Recibidas.pdf	{"duplicate":true,"originalInvoice":"831f09bb-a629-47c7-8871-9d12a52fc076"}	\N	2025-09-20 15:23:05.095966
57dd8cf1-ff92-4e07-9c3a-46e84f6ece6a	user-test	Franco Nicolás Corts Romeo	upload	invoice	ed167294-25a5-4f96-8542-d14c37d8fe5e	Cargó factura 5320742646 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"15Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 15:23:10.578241
f50dd334-77c3-47ec-95d8-62806c00ca75	user-test	Franco Nicolás Corts Romeo	upload	invoice	8b0fa390-68ab-47e7-98ca-15355de9c232	Intentó cargar factura duplicada: 17Recibidas.pdf	{"duplicate":true,"originalInvoice":"8b0fa390-68ab-47e7-98ca-15355de9c232"}	\N	2025-09-20 15:23:10.635763
fc04dab0-9b26-418d-979d-98ca0dc68806	user-test	Franco Nicolás Corts Romeo	delete	invoice	3e9a9950-3312-47d9-b6d1-af8e4c8cb590	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:46.964897
3c50460e-769e-47d9-bec4-cff16b6205ea	user-test	Franco Nicolás Corts Romeo	delete	invoice	39f45fb3-c033-4a14-bbd2-b8a9d7e5bb98	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:47.790853
ffef0879-26f7-4dde-8495-2e26bfd5221e	user-test	Franco Nicolás Corts Romeo	delete	invoice	9654632e-9d19-4451-8f79-76f66ac5b798	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:48.286163
e216007c-b569-4a43-9a82-d7ec2da089f7	user-test	Franco Nicolás Corts Romeo	delete	invoice	86d770ee-2e45-422c-974c-57497da4d47e	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:49.260347
7301339b-3c55-4760-9bfa-117496b067e5	user-test	Franco Nicolás Corts Romeo	delete	invoice	ed167294-25a5-4f96-8542-d14c37d8fe5e	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:49.636881
822fb075-fea6-4f1d-94e4-8794bceeafb3	user-test	Franco Nicolás Corts Romeo	delete	invoice	86e42361-772a-43eb-9502-c816769267da	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:49.989144
2be04e92-099e-4747-9a07-4b83f3ce15ed	user-test	Franco Nicolás Corts Romeo	delete	invoice	ae6387a7-880b-45df-8afa-142f14a0ba51	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:50.375653
816d6baf-779c-46b7-a473-d54d2527da43	user-test	Franco Nicolás Corts Romeo	delete	invoice	b8567ad9-325b-4025-919e-4a5ccbe95328	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:50.73353
d90fd1d7-ef88-4c58-9bd1-f219a38ddf8a	user-test	Franco Nicolás Corts Romeo	delete	invoice	9d1ba457-208d-4f8e-92e6-2ffd5b62d713	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:51.093998
67fa5c0b-55b5-4ff1-8f36-8f26fbf0d314	user-test	Franco Nicolás Corts Romeo	delete	invoice	434235f5-c88d-494b-92a6-7e3552a761bd	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:51.460402
9235d928-ff75-40b2-aa72-e2578d1931df	user-test	Franco Nicolás Corts Romeo	delete	invoice	d89549c6-632c-43ed-8719-829bb7cadee2	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:51.815481
9de5d8f9-d6a3-4269-a1ff-6e88bb91effb	user-test	Franco Nicolás Corts Romeo	delete	invoice	03ba0e3b-35d3-431c-8064-54819a76ed80	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:52.18418
27c600a6-e2f9-4639-a4e4-7c902cae4ed1	user-test	Franco Nicolás Corts Romeo	delete	invoice	90eff3b4-8ff4-4589-8d73-98b280aafa80	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:52.530582
52d10302-ffc1-423e-a3e4-1624adcb6472	user-test	Franco Nicolás Corts Romeo	delete	invoice	831f09bb-a629-47c7-8871-9d12a52fc076	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:52.876831
83d3abe7-7980-4aa2-b554-8ff580877ce3	user-test	Franco Nicolás Corts Romeo	delete	invoice	8b0fa390-68ab-47e7-98ca-15355de9c232	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 15:29:53.238359
064ea37f-90b5-40a6-a108-1cc4ecd4f96d	user-test	Franco Nicolás Corts Romeo	delete	client_provider	a6223cf9-f4a2-42a0-b8ea-ea400f995ee2	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:02.001495
9b66ce44-9419-437b-b492-5ca68b60e6ed	user-test	Franco Nicolás Corts Romeo	delete	client_provider	508b0498-b339-4b6f-b8c9-c7b60f76f4fe	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:02.322424
9ce4d27e-0b56-48dd-936f-01187a592639	user-test	Franco Nicolás Corts Romeo	delete	client_provider	bfb360bf-1dc8-47e7-97e4-22ba9f1500a8	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:02.616449
6e0b5f22-be74-4d24-908f-06b1e0f1f45d	user-test	Franco Nicolás Corts Romeo	delete	client_provider	4966d123-e952-4b59-b21e-ac5f5624a3d5	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:02.921736
1b835b0e-444d-495a-866c-d45d41625900	user-test	Franco Nicolás Corts Romeo	delete	client_provider	5ecafe6b-a9e9-4394-8baf-5f9b41e52dd5	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:03.527643
8042609c-cc87-40b8-8511-4d3805a8ceae	user-test	Franco Nicolás Corts Romeo	delete	client_provider	68abb6c5-e5cf-4b42-ae52-879117bb1c9d	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:03.82598
2569df94-9331-4f43-8c37-660f957ac97d	user-test	Franco Nicolás Corts Romeo	delete	client_provider	3ea68ffa-2fdf-4817-b1dc-0cef478f4698	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:04.719399
fc0ee376-a2f4-4a0c-92b7-cb8a4b4b6c5c	user-test	Franco Nicolás Corts Romeo	delete	client_provider	c523cde4-9581-4138-a26c-554391e8e302	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:05.013986
4184e416-40a4-443d-b1a7-8e30ff687095	user-test	Franco Nicolás Corts Romeo	delete	client_provider	eb6ce227-af78-4087-9269-3e3f9bda1141	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:05.610849
b27dc9dc-c4fb-4c42-b3b1-87b620dea43d	user-test	Franco Nicolás Corts Romeo	delete	client_provider	3cd945e2-e1d4-4dc7-abba-b041928b61d5	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:04.128771
235802c0-4a8e-44b8-99eb-0445741c7558	user-test	Franco Nicolás Corts Romeo	delete	client_provider	2d6ebb68-7e9f-4b9b-8d17-bff18792f12c	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:04.42563
d58d62c2-fda3-43a4-a9a6-3094f92b0fb6	user-test	Franco Nicolás Corts Romeo	delete	client_provider	c8716af1-5eee-4b6f-8521-134c8a348b7c	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:05.31492
ccf2eb5e-3e3b-4b06-92a7-332dcead6b9f	user-test	Franco Nicolás Corts Romeo	delete	client_provider	83472183-c7a8-4c33-97a1-be88635aac24	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 15:30:05.909146
50ee5299-0b40-42e6-a87c-1226e1bacc0e	user-test	Franco Nicolás Corts Romeo	upload	invoice	5818086e-3e0c-4dc0-baff-167165c02aa1	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 16:00:17.772146
820e7e93-e788-4a08-acef-eb5efc8401a8	user-test	Franco Nicolás Corts Romeo	upload	invoice	1df0536d-be65-44c1-b597-b945590e9d9b	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:00:23.644297
2522edcd-a3a6-4e31-bf09-d1ea7618ec6e	user-test	Franco Nicolás Corts Romeo	upload	invoice	ea355d76-ca09-4951-8bbd-866b6054520d	Cargó factura 00026-00051500 por 58999.01 (procesada con IA)	{"invoiceType":"expense","fileName":"5Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:01:17.933226
811db9f6-e25b-4dc4-8680-ce33839ce40b	user-test	Franco Nicolás Corts Romeo	upload	invoice	27aa9c86-5a7a-4816-be40-39607a03d3d4	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:01:18.725768
2005a783-293f-4420-aa7d-030a93d10ead	user-test	Franco Nicolás Corts Romeo	upload	invoice	4346c794-d94b-495e-9a64-67b2d980cb52	Cargó factura 0013-08888490 por 27700.53 (procesada con IA)	{"invoiceType":"expense","fileName":"4Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:01:18.829096
3accdc1a-a8db-4bc7-95e4-fa2a6a789895	user-test	Franco Nicolás Corts Romeo	upload	invoice	e833b5c2-f9ec-46b6-96c2-0a5c2ce28ac4	Cargó factura 0004-00036078 por 81083.76 (procesada con IA)	{"invoiceType":"expense","fileName":"13Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 16:01:18.88112
28132d8b-a471-4ed8-bfab-db7e31545776	user-test	Franco Nicolás Corts Romeo	upload	invoice	e2802d6a-0072-48dc-9d84-ec52a454b40a	Cargó factura 0100-00104041 por 256301.37 (procesada con IA)	{"invoiceType":"expense","fileName":"14Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 16:01:24.588114
1286ef90-f988-4744-974f-838a298636e8	user-test	Franco Nicolás Corts Romeo	upload	invoice	1423853e-536c-4f31-900e-68ccae3cd46a	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"17Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 16:01:24.620261
d9b076e8-5eb3-4bcd-8ef4-c33e4c7da325	user-test	Franco Nicolás Corts Romeo	upload	invoice	8f937b6e-6ef1-4d0e-b66f-c14736b63d29	Cargó factura 5320742646 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"15Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 16:02:18.619814
c775c78d-b0ed-469a-91fd-97eba607003a	user-test	Franco Nicolás Corts Romeo	upload	invoice	d8b902b9-b7b6-4881-a352-7ac7606d31a6	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"expense","fileName":"16Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 16:02:18.727193
ea078c38-b070-4ed5-878c-db20cd5b5678	user-test	Franco Nicolás Corts Romeo	upload	invoice	b52fd32f-e308-41b6-8788-d54836519acc	Cargó factura 00000082 por 52700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"6Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:09:52.372832
a5ee115d-3641-4527-85eb-f96ddfdfd688	user-test	Franco Nicolás Corts Romeo	upload	invoice	98b083db-4b4a-47e1-8d5c-d69dc4edfbf4	Cargó factura 00026-00051698 por 40499.17 (procesada con IA)	{"invoiceType":"expense","fileName":"7Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:09:58.087323
55e0e14b-7ad4-4f30-8c9c-e545beeee381	user-test	Franco Nicolás Corts Romeo	upload	invoice	d4f87bdf-7b20-4917-9fda-2f7b08227f1d	Cargó factura 00000013 por 27700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"8Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:09:58.150766
e19a6e4c-9a9e-4f77-9b71-45c4051cf49d	user-test	Franco Nicolás Corts Romeo	upload	invoice	d6f0252c-0828-4810-94ed-ee7b5ac33355	Cargó factura 00230-00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"10Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:10:47.319636
b53b9bdd-c667-439b-b5d7-57fd71d9825e	user-test	Franco Nicolás Corts Romeo	upload	invoice	4de50089-bbf0-49f0-8ade-111fedc15e8e	Cargó factura 00019-00003745 por 347000.00 (procesada con IA)	{"invoiceType":"expense","fileName":"9Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:10:47.40371
0dd6d168-062a-441b-b833-f7c2358d0acf	user-test	Franco Nicolás Corts Romeo	upload	invoice	78544889-f6af-41ff-a1c8-870b269c66b3	Cargó factura 00230 00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"11Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:10:47.446756
98832b9b-fe93-4fab-9a9b-c4994f595604	user-test	Franco Nicolás Corts Romeo	upload	invoice	ee743b0f-648f-4421-9271-bb3966d990db	Cargó factura 00225-00067530 por 50000.06 (procesada con IA)	{"invoiceType":"expense","fileName":"12Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 16:10:58.250068
e90f9af7-c385-45d5-acf1-c4c8bd797cd4	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.65.130	2025-09-20 16:31:39.842518
895fe23a-5345-4a3d-a32a-a5aae3014f45	user-test	Franco Nicolás Corts Romeo	login	user	user-test	User Franco Nicolás Corts Romeo logged in successfully	{"email":"cortsfranco@hotmail.com","success":true}	172.31.65.130	2025-09-20 16:32:59.706376
7335e88a-6fa8-4176-8ea8-43bbe5a3c3b0	user-test	Franco Nicolás Corts Romeo	delete	invoice	4346c794-d94b-495e-9a64-67b2d980cb52	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:50.672542
f1169353-f18f-4ae9-b59d-1536c7d6e63c	user-test	Franco Nicolás Corts Romeo	delete	invoice	5818086e-3e0c-4dc0-baff-167165c02aa1	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:51.096841
3e93c10d-c9ae-4f85-92b6-b4794d032c00	user-test	Franco Nicolás Corts Romeo	delete	invoice	1df0536d-be65-44c1-b597-b945590e9d9b	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:51.621285
1f43c096-760f-41c2-a15b-98c0f02e8eec	user-test	Franco Nicolás Corts Romeo	delete	invoice	27aa9c86-5a7a-4816-be40-39607a03d3d4	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:52.021686
f4e24667-f8d6-440c-93a0-8aa09db0c70f	user-test	Franco Nicolás Corts Romeo	delete	invoice	78544889-f6af-41ff-a1c8-870b269c66b3	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:52.485899
3eeb01c1-2720-4604-b31c-727c2cd7cc9d	user-test	Franco Nicolás Corts Romeo	delete	invoice	d6f0252c-0828-4810-94ed-ee7b5ac33355	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:52.853649
53882e32-62c5-4d2a-86f6-5d0d5b9883e3	user-test	Franco Nicolás Corts Romeo	delete	invoice	e833b5c2-f9ec-46b6-96c2-0a5c2ce28ac4	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:53.730236
30e1e870-12e7-486c-af30-ea57bd284f04	user-test	Franco Nicolás Corts Romeo	delete	invoice	4de50089-bbf0-49f0-8ade-111fedc15e8e	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:54.548118
55ea2304-07b1-4aec-b77e-3569c088aad4	user-test	Franco Nicolás Corts Romeo	delete	invoice	ea355d76-ca09-4951-8bbd-866b6054520d	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:56.214892
80d4e760-12d3-404b-9329-6d1ae5bb2d61	user-test	Franco Nicolás Corts Romeo	delete	invoice	b52fd32f-e308-41b6-8788-d54836519acc	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:56.650652
06f72f9c-419e-4e8b-a149-122b9c75518d	user-test	Franco Nicolás Corts Romeo	delete	invoice	d8b902b9-b7b6-4881-a352-7ac7606d31a6	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:57.113791
30ddc45e-4fb7-49ee-9820-176a5a6b8c2d	user-test	Franco Nicolás Corts Romeo	delete	invoice	1423853e-536c-4f31-900e-68ccae3cd46a	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:57.523008
d76e5b9e-595c-48ed-86ed-0d353cf5d4e5	user-test	Franco Nicolás Corts Romeo	delete	invoice	ee743b0f-648f-4421-9271-bb3966d990db	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:57.934044
6854a738-ae73-4708-9be4-a9a25e404d85	user-test	Franco Nicolás Corts Romeo	delete	client_provider	add91f64-3d0c-4076-ae4a-ed75f00e145d	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:16.971265
38780497-25dd-4070-8bf8-2de088b6ec59	user-test	Franco Nicolás Corts Romeo	delete	client_provider	68409bb9-b655-43af-958e-953b698c3494	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:17.324999
4aeb6dcc-7214-4deb-ac3b-bd9d934ffb78	user-test	Franco Nicolás Corts Romeo	delete	client_provider	bfd9c924-b6e1-4f9d-9c46-126d9c68e2fc	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:18.003326
56e93351-799f-4cea-9e25-c5cd5259c050	user-test	Franco Nicolás Corts Romeo	delete	client_provider	eb5f937b-7df6-49e7-a1a6-8ffc3dc8234c	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:18.479908
b7b4f7ff-c94b-4a25-a605-f70d3be0f62b	user-test	Franco Nicolás Corts Romeo	delete	client_provider	103b489a-2ae5-47a2-9d53-b6ea1d61aedf	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:19.085938
58863c67-0e0d-4330-a1b7-f358724ce1a2	user-test	Franco Nicolás Corts Romeo	delete	client_provider	98b5f2bc-a104-4ecf-9732-9153374b3051	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:19.820401
ef72e485-6ae1-40be-8516-4c50a5ace20f	user-test	Franco Nicolás Corts Romeo	delete	client_provider	34077a05-6d04-4c6a-994d-cce088f239e2	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:20.426059
eb813eb2-3d67-4731-828e-e417652311cc	user-test	Franco Nicolás Corts Romeo	delete	client_provider	7c6083fc-1a97-4b8c-9f74-c2a2804c52d2	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:22.249291
8de01774-28d9-4f64-92ae-095a18be020b	user-test	Franco Nicolás Corts Romeo	delete	client_provider	9b87ac85-ea8b-41f2-b8f5-ba4fbda8f30c	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:26.06402
552e7df7-b0d4-49b5-8ff8-1c14653cb72a	user-test	Franco Nicolás Corts Romeo	delete	client_provider	a27ff743-d0cc-4cbb-ad9f-66cbbe7594b3	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:28.136271
2e12228d-0068-44bc-a2f3-082fe370b4f4	user-test	Franco Nicolás Corts Romeo	delete	client_provider	a45ffe26-15eb-402f-a8e7-ee5349f4495b	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:28.781487
d80a7323-6c8d-4da6-921a-a0a986b49e02	user-test	Franco Nicolás Corts Romeo	delete	client_provider	30d19012-0c1c-44a8-a0e7-0230156d58b2	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:29.095632
8a35236e-3280-4c62-9997-c6cf6bbb5215	user-test	Franco Nicolás Corts Romeo	delete	client_provider	c81d2513-e6dd-4e42-9bfa-39d10129e2c5	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:29.401516
e7237091-b8ef-4f97-8f88-9d04232e5021	user-test	Franco Nicolás Corts Romeo	delete	invoice	8f937b6e-6ef1-4d0e-b66f-c14736b63d29	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:53.225435
593f02c4-a0e0-479a-ad3f-32edddfee974	user-test	Franco Nicolás Corts Romeo	delete	invoice	e2802d6a-0072-48dc-9d84-ec52a454b40a	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:54.129873
95e3f0eb-432f-434c-bed1-07863edf09d7	user-test	Franco Nicolás Corts Romeo	delete	invoice	d4f87bdf-7b20-4917-9fda-2f7b08227f1d	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:55.008355
4638e3a1-615f-4746-83b6-ccc24e261e86	user-test	Franco Nicolás Corts Romeo	delete	invoice	98b083db-4b4a-47e1-8d5c-d69dc4edfbf4	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 16:40:55.600819
a862d9e4-508a-4705-b3c7-3cbb7e41a4de	user-test	Franco Nicolás Corts Romeo	delete	client_provider	8b141dec-1a83-49ad-b6e8-9011f565a992	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 16:41:17.660221
b7aea240-f699-4c93-9bf1-5590718035ce	user-test	Franco Nicolás Corts Romeo	upload	invoice	7d9d9efe-47e0-4de7-a25d-73f3bea755a5	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 16:45:13.732362
06716cb9-4148-4a0a-b74d-e4a352a9084a	user-test	Franco Nicolás Corts Romeo	delete	invoice	7d9d9efe-47e0-4de7-a25d-73f3bea755a5	Eliminó factura y la movió a la papelera	\N	172.31.65.130	2025-09-20 17:03:05.842996
c0ae12f5-3b89-4b72-b52b-7415966bd21a	user-test	Franco Nicolás Corts Romeo	delete	client_provider	eda6524b-c234-402b-93d0-3373e3bff2d2	Eliminó cliente/proveedor	\N	172.31.65.130	2025-09-20 17:03:24.160543
77d16d99-2c63-4cc5-9828-89d6a605ccee	user-test	Franco Nicolás Corts Romeo	upload	invoice	5c776833-a735-448b-aa2c-5c839d537a23	Cargó factura 5294757366 por 6.00 (procesada con IA)	{"invoiceType":"income","fileName":"1Emitidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 17:16:29.225799
b7b590a4-3649-4fc5-8197-d70186645403	user-test	Franco Nicolás Corts Romeo	upload	invoice	20de3fe2-7d84-49b3-97a0-3206bdff944e	Cargó factura 00009-00014780 por 12845.59 (procesada con IA)	{"invoiceType":"income","fileName":"2Emitidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 17:16:57.940833
632d2290-1e1a-4feb-b805-d1c0af7bda96	user-test	Franco Nicolás Corts Romeo	upload	invoice	73557bbb-b9fb-43c2-94ca-649bf04a79a3	Cargó factura 0025-00000644 por 57954.27 (procesada con IA)	{"invoiceType":"expense","fileName":"2Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:17:23.712273
48fc6c54-17c0-4b2d-b296-96dd260fa195	user-test	Franco Nicolás Corts Romeo	upload	invoice	0f36aaa3-6f37-4b99-b1d5-92d9c69fcdb0	Cargó factura 00015 00000305 por 75250.00 (procesada con IA)	{"invoiceType":"expense","fileName":"1Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 17:17:40.177828
c9ebe0f3-b00f-4f25-8216-579eea81c198	user-test	Franco Nicolás Corts Romeo	upload	invoice	9827e65b-cba4-46f2-82d3-e946258f41de	Cargó factura 00026-00051500 por 58999.01 (procesada con IA)	{"invoiceType":"expense","fileName":"5Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:17:52.924491
2aeb1a9f-b7fb-480d-ad9a-bb7915c52790	user-test	Franco Nicolás Corts Romeo	upload	invoice	e32128ba-a5f5-4de4-a3fd-9167dd211d7d	Cargó factura 00026-00051698 por 40499.17 (procesada con IA)	{"invoiceType":"expense","fileName":"7Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:17:58.058861
8ef08894-8347-47f7-a749-79fff45652f6	user-test	Franco Nicolás Corts Romeo	upload	invoice	12d4afcd-3fcb-45a8-8a9b-599c2f0be86c	Cargó factura 00013-00000942 por 0.00 (procesada con IA)	{"invoiceType":"expense","fileName":"3Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:18:09.116705
8cfefc00-5f15-46bd-b65d-cbb7f830d39f	user-test	Franco Nicolás Corts Romeo	upload	invoice	9eae89c2-fec2-4ee4-a6db-6bd1c8f0373f	Cargó factura 0013-08888490 por 27700.53 (procesada con IA)	{"invoiceType":"expense","fileName":"4Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:19:20.110396
1b4239e9-e13f-46ff-94d6-05c076457b71	user-test	Franco Nicolás Corts Romeo	upload	invoice	0298c0fc-e0ae-4a0b-8cab-faed9e7a3581	Cargó factura 00000082 por 52700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"6Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:19:30.848569
c9a518e2-9197-4848-b047-ee9605adad1d	user-test	Franco Nicolás Corts Romeo	upload	invoice	345cd4e9-0b36-49b6-af08-2bc4e7ba3643	Cargó factura 00000013 por 27700.00 (procesada con IA)	{"invoiceType":"expense","fileName":"8Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:19:30.94751
4486ab8a-da15-4724-9a8d-51e37412607a	user-test	Franco Nicolás Corts Romeo	upload	invoice	11ec02af-605e-49d8-9b6e-2a79833518e1	Cargó factura 00230-00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"10Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:19:54.861536
789fe0ff-b9e8-44da-8eb1-ba455da7c482	user-test	Franco Nicolás Corts Romeo	upload	invoice	b2a3e6d6-10e6-4474-b5f8-25e4928d8c55	Cargó factura 00225-00067530 por 50000.06 (procesada con IA)	{"invoiceType":"expense","fileName":"12Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:20:20.565715
2eb80f84-f5d4-4296-9459-6b026ffedd7a	user-test	Franco Nicolás Corts Romeo	upload	invoice	4367f75d-e6e9-400b-ba16-b8a2f56007f0	Cargó factura 0100-00104041 por 256301.37 (procesada con IA)	{"invoiceType":"expense","fileName":"14Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 17:20:20.658551
2c514c02-6525-4924-bab4-960dc407273b	user-test	Franco Nicolás Corts Romeo	upload	invoice	f03f17a6-d126-4f45-a1b2-efa57fc2baa7	Cargó factura 00019-00003745 por 347000.00 (procesada con IA)	{"invoiceType":"expense","fileName":"9Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:20:53.671595
efc28948-aafc-4c2d-9698-e81258cdcbfc	user-test	Franco Nicolás Corts Romeo	upload	invoice	75453f2b-5602-4b93-b2c2-0de145199aa7	Cargó factura 00230 00010198 por 49999.95 (procesada con IA)	{"invoiceType":"expense","fileName":"11Recibidas.jpg","aiProcessed":true,"async":true}	\N	2025-09-20 17:21:34.092323
89eb0ff8-7e6b-402f-a139-0d297c155229	user-test	Franco Nicolás Corts Romeo	upload	invoice	4ecaad71-7751-4f1f-8d44-3170f304b31c	Cargó factura 0004-00036078 por 81083.76 (procesada con IA)	{"invoiceType":"expense","fileName":"13Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 17:21:39.760172
6f32b39e-de69-45ff-bd8f-a3887757f248	user-test	Franco Nicolás Corts Romeo	upload	invoice	f3482440-f916-4061-9e14-7d58947aabf7	Cargó factura 5320742646 por 6.00 (procesada con IA)	{"invoiceType":"expense","fileName":"15Recibidas.pdf","aiProcessed":true,"async":true}	\N	2025-09-20 17:21:39.886306
\.


--
-- Data for Name: ai_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_feedback (id, invoice_id, user_id, original_data, corrected_data, feedback_type, confidence, created_at) FROM stdin;
\.


--
-- Data for Name: clients_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients_providers (id, name, cuit, type, email, phone, address, total_operations, last_invoice_date, created_at, updated_at) FROM stdin;
1994e9e8-03b1-43d6-9c3f-d9782d772dbd	Cliente no identificado	\N	client	\N	\N	\N	12851.59	2025-09-20 17:16:57.878	2025-09-20 17:16:29.106532	2025-09-20 17:16:57.879
1d967a7e-84bb-460b-b73b-c2424a586440	MOPAR	\N	provider	\N	\N	\N	57954.27	2025-09-20 17:17:23.656	2025-09-20 17:17:23.621336	2025-09-20 17:17:23.656
bf0c3ab6-4e81-4d7a-9396-bd6e2de631e8	La Golo sineria	\N	provider	\N	\N	\N	75250.00	2025-09-20 17:17:40.122	2025-09-20 17:17:40.087392	2025-09-20 17:17:40.122
3aafe7ff-bc83-488a-8d56-4faa06b899f0	S.A.	\N	provider	\N	\N	\N	99498.18	2025-09-20 17:17:58.004	2025-09-20 17:17:52.836916	2025-09-20 17:17:58.004
7377ad58-b549-4b6e-9ecf-cd75226e4ace	M ercado etalurgico	\N	provider	\N	\N	\N	0.00	2025-09-20 17:18:09.085	2025-09-20 17:18:09.052838	2025-09-20 17:18:09.085
fa1d437d-adba-4161-b296-93a54afd0f32	50 AÑOS\nMAZA SOLUCIONES ELÉCTRICAS	\N	provider	\N	\N	\N	27700.53	2025-09-20 17:19:20.05	2025-09-20 17:19:20.012009	2025-09-20 17:19:20.05
6f7fdeae-f2db-4dfc-9991-1e09b77da3b5	CHAPLA JOSE LUIS	\N	provider	\N	\N	\N	52700.00	2025-09-20 17:19:30.792	2025-09-20 17:19:30.758514	2025-09-20 17:19:30.792
de08eeb1-eb31-48a6-9ddc-89fc7d93c20e	Magistretti Gonzalez Lucas	\N	provider	\N	\N	\N	27700.00	2025-09-20 17:19:30.888	2025-09-20 17:19:30.842216	2025-09-20 17:19:30.888
829a6dea-1228-43e3-81d4-1471f67cab40	ALLUB HERMANOS S.R.L. PIROVANO	\N	provider	\N	\N	\N	49999.95	2025-09-20 17:19:54.801	2025-09-20 17:19:54.765727	2025-09-20 17:19:54.801
1a0f1389-b5c7-4589-8f60-06dca179ed00	despegar	\N	provider	\N	\N	\N	256301.37	2025-09-20 17:20:20.601	2025-09-20 17:20:20.562966	2025-09-20 17:20:20.601
6657f2b5-34e1-4792-8458-5411e9c52a0a	HOLT\nAGRO-COSECHA S.A.	\N	provider	\N	\N	\N	347000.00	2025-09-20 17:20:53.613	2025-09-20 17:20:53.579284	2025-09-20 17:20:53.613
a2fbdc0c-555c-4453-8c14-d6429adb66f2	ALLUB HERMANOS S.R.L.	\N	provider	\N	\N	\N	100000.01	2025-09-20 17:21:34.032	2025-09-20 17:20:20.470668	2025-09-20 17:21:34.032
2915f5c6-d490-4bce-ac88-b419b8884cd8	Lumen	\N	provider	\N	\N	\N	81083.76	2025-09-20 17:21:39.695	2025-09-20 17:21:39.65791	2025-09-20 17:21:39.695
1adca01e-af00-4b68-81f2-763dbf5d9dc6	Google®	\N	provider	\N	\N	\N	6.00	2025-09-20 17:21:39.823	2025-09-20 17:21:39.785068	2025-09-20 17:21:39.823
\.


--
-- Data for Name: deleted_invoices_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deleted_invoices_log (id, original_invoice_id, type, invoice_number, date, client_provider_name, subtotal, iva_amount, total_amount, uploaded_by_name, deleted_by, deleted_by_name, deleted_at, original_data, invoice_class, description) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, type, invoice_number, date, client_provider_id, client_provider_name, subtotal, iva_amount, total_amount, uploaded_by, uploaded_by_name, file_path, file_name, extracted_data, processed, created_at, updated_at, file_size, owner_id, owner_name, invoice_class, iibb_amount, ganancias_amount, other_taxes, payment_status, payment_date, due_date, fingerprint, needs_review, extraction_confidence, ai_extracted, review_status, description) FROM stdin;
5c776833-a735-448b-aa2c-5c839d537a23	income	5294757366	2025-06-30 00:00:00	1994e9e8-03b1-43d6-9c3f-d9782d772dbd	Cliente no identificado	4.74	0.00	6.00	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/b5669aed54c3fe060a7bdce7d1eba560	1Emitidas.pdf	{"invoice_number":"5294757366","invoice_class":"A","date":"2025-06-30","total":6,"client_name":"Cliente no identificado","supplier_name":"Google®","vat_amount":0,"type":"income","needs_review":true,"detection_method":"fiscal_rule_RI_default","description":null}	t	2025-09-20 17:16:29.137196	2025-09-20 17:16:29.186	92776	user-test	Joni	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.424	\N	28079dc508ebc0129d1756545a5a44e02f923e9b0497d6545bb0ba44bd826907	t	95.00	f	approved	\N
e32128ba-a5f5-4de4-a3fd-9167dd211d7d	expense	00026-00051698	2025-07-14 00:00:00	3aafe7ff-bc83-488a-8d56-4faa06b899f0	S.A.	34638.69	5860.48	40499.17	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/ff18281a88ee265ea89f87aa7f649e49	7Recibidas.jpg	{"invoice_number":"00026-00051698","invoice_class":"A","date":"2025-07-14","total":40499.17,"client_name":"S.A.","supplier_name":"S.A.","supplier_cuit":"30-71573214-5","vat_amount":5860.48,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":34638.69}	t	2025-09-20 17:17:57.992683	2025-09-20 17:17:58.026	104905	user-test	Joni	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.318	\N	44d626a24cac87b8b07afbff81f8a02ebb9d2f28fe8179de8b0c9ddcf37606b9	f	95.00	f	approved	\N
12d4afcd-3fcb-45a8-8a9b-599c2f0be86c	expense	00013-00000942	2025-08-12 00:00:00	7377ad58-b549-4b6e-9ecf-cd75226e4ace	M ercado etalurgico	0.00	0.00	0.00	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/de9df32afbfa7c72a2e0c1f90d15b773	3Recibidas.jpg	{"invoice_number":"00013-00000942","invoice_class":"A","date":"2025-08-12","client_name":"M ercado etalurgico","supplier_name":"M ercado etalurgico","supplier_cuit":"30-71005192-1","type":"expense","needs_review":true,"detection_method":"unknown_issuer_default_A","description":null}	f	2025-09-20 17:18:09.074482	2025-09-20 17:18:09.074482	123437	user-test	Joni	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.129	\N	9dfeeb03111c957bb4c266352beacc60d03af199dca97eb496cb3e1cb98f7cfb	t	95.00	f	pending_review	\N
20de3fe2-7d84-49b3-97a0-3206bdff944e	income	00009-00014780	2025-07-01 00:00:00	1994e9e8-03b1-43d6-9c3f-d9782d772dbd	Cliente no identificado	10616.19	2229.40	12845.59	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/c24d36651fa1feecf06e657486a3fbef	2Emitidas.pdf	{"invoice_number":"00009-00014780","invoice_class":"A","date":"2025-07-01","total":12845.59,"client_name":"Cliente no identificado","supplier_name":"COVERSUN CORTINAS & TOLDOS","supplier_cuit":"30-71021270-4","vat_amount":2229.4,"type":"income","needs_review":false,"detection_method":"header_type_A","description":null,"subtotal":10616.19}	t	2025-09-20 17:16:57.866458	2025-09-20 17:16:57.903	66922	user-test	Hernán	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.381	\N	f482d5d88e13fd4c941e5044919551d128363fa8c82a68e75aee763ce6803d93	f	95.00	f	approved	\N
0298c0fc-e0ae-4a0b-8cab-faed9e7a3581	expense	00000082	2025-07-10 00:00:00	6f7fdeae-f2db-4dfc-9991-1e09b77da3b5	CHAPLA JOSE LUIS	43553.72	9146.28	52700.00	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/8ba63ad281f130641b77801999d84258	6Recibidas.jpg	{"invoice_number":"00000082","invoice_class":"A","date":"2025-07-10","total":52700,"client_name":"CHAPLA JOSE LUIS","supplier_name":"CHAPLA JOSE LUIS","supplier_cuit":"20222689555","vat_amount":9146.28,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":43553.72}	t	2025-09-20 17:19:30.781303	2025-09-20 17:19:30.815	95009	user-test	Hernán	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.339	\N	faaafcfc522d806992cc17988cc8ec442b4ca2c72d841722758fe1f2af514e6c	f	95.00	f	approved	\N
9eae89c2-fec2-4ee4-a6db-6bd1c8f0373f	expense	0013-08888490	\N	fa1d437d-adba-4161-b296-93a54afd0f32	50 AÑOS\nMAZA SOLUCIONES ELÉCTRICAS	22813.00	4887.53	27700.53	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/763e8178a11bb3c106f72e99bd59bda8	4Recibidas.jpg	{"invoice_number":"0013-08888490","invoice_class":"A","total":27700.53,"client_name":"50 AÑOS\\nMAZA SOLUCIONES ELÉCTRICAS","supplier_name":"50 AÑOS\\nMAZA SOLUCIONES ELÉCTRICAS","supplier_cuit":"30587108786","vat_amount":4887.53,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":22813}	t	2025-09-20 17:19:20.037006	2025-09-20 17:19:20.074	81745	user-test	Hernán	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.015	\N	6a61339de905b1383b954ef634bf45bcabb558a369b96a536a0d384d338ce91f	t	95.00	f	pending_review	\N
9827e65b-cba4-46f2-82d3-e946258f41de	expense	00026-00051500	2025-07-10 00:00:00	3aafe7ff-bc83-488a-8d56-4faa06b899f0	S.A.	50617.98	8381.03	58999.01	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/84ced09682aabb553eca259a2a395969	5Recibidas.jpg	{"invoice_number":"00026-00051500","invoice_class":"A","date":"2025-07-10","total":58999.01,"client_name":"S.A.","supplier_name":"S.A.","supplier_cuit":"30-71573214-5","vat_amount":8381.03,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":50617.98}	t	2025-09-20 17:17:52.858974	2025-09-20 17:17:52.891	76773	user-test	Joni	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.36	\N	475a224855a08f6212233686cd0e0443591c01c432124b39eaa02b3bc60b8e1f	f	95.00	f	approved	\N
0f36aaa3-6f37-4b99-b1d5-92d9c69fcdb0	expense	00015 00000305	2025-08-28 00:00:00	bf0c3ab6-4e81-4d7a-9396-bd6e2de631e8	La Golo sineria	62190.08	13059.92	75250.00	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/a1ce35b72975fbd342086ef3ad05e8e8	1Recibidas.pdf	{"invoice_number":"00015 00000305","invoice_class":"A","date":"2025-08-28","total":75250,"client_name":"La Golo sineria","supplier_name":"La Golo sineria","supplier_cuit":"30714767891","vat_amount":13059.92,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":62190.08}	t	2025-09-20 17:17:40.110615	2025-09-20 17:17:40.144	55944	user-test	Joni	A	0.00	0.00	0.00	paid	\N	\N	2c6f7c9918d3a9010699c2f73e10b03e33aed4cca6b8b391e71d376e07c887e9	f	95.00	f	approved	\N
73557bbb-b9fb-43c2-94ca-649bf04a79a3	expense	0025-00000644	2025-08-01 00:00:00	1d967a7e-84bb-460b-b73b-c2424a586440	MOPAR	48059.64	9894.63	57954.27	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/4b4141972874717387974567e6f4b894	2Recibidas.jpg	{"invoice_number":"0025-00000644","invoice_class":"A","date":"2025-08-01","total":57954.27,"client_name":"MOPAR","supplier_name":"MOPAR","supplier_cuit":"30672063171","vat_amount":9894.63,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":48059.64}	t	2025-09-20 17:17:23.64442	2025-09-20 17:17:23.679	95243	user-test	Hernán	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.15	\N	5b2c7b5c7447d741894c6aaa3a9e596d9e9dad12ef80f04a6d2c4f75b0769428	f	95.00	f	approved	\N
b2a3e6d6-10e6-4474-b5f8-25e4928d8c55	expense	00225-00067530	2025-06-30 00:00:00	a2fbdc0c-555c-4453-8c14-d6429adb66f2	ALLUB HERMANOS S.R.L.	42712.30	7287.76	50000.06	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/a8a2be5e2fb528cb41f727b4d27299dc	12Recibidas.jpg	{"invoice_number":"00225-00067530","invoice_class":"A","date":"2025-06-30","total":50000.06,"client_name":"ALLUB HERMANOS S.R.L.","supplier_name":"ALLUB HERMANOS S.R.L.","supplier_cuit":"30-52765133-2","vat_amount":7287.76,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":42712.299999999996}	t	2025-09-20 17:20:20.495471	2025-09-20 17:20:20.531	74349	user-test	Hernán	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.403	\N	1ef61dae89dbd79b0e3d321edb3b61eedc67340ef5a3bd3c9503533a451c211d	f	95.00	f	approved	\N
4ecaad71-7751-4f1f-8d44-3170f304b31c	expense	0004-00036078	2025-07-30 00:00:00	2915f5c6-d490-4bce-ac88-b419b8884cd8	Lumen	67011.37	14072.39	81083.76	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/3a5e2affb52bf4c16f00974b55ecfa4a	13Recibidas.pdf	{"invoice_number":"0004-00036078","invoice_class":"A","date":"2025-07-30","total":81083.76,"client_name":"Lumen","supplier_name":"Lumen","supplier_cuit":"30-71239395-1","vat_amount":14072.39,"type":"expense","needs_review":false,"detection_method":"header_type_A","description":null,"subtotal":67011.37}	t	2025-09-20 17:21:39.682374	2025-09-20 17:21:39.722	29797	user-test	Joni	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.234	\N	dda16c8ff93987dd2f911e2fd89306c5d81131939e2e89ebecf499fe292a7197	f	95.00	f	approved	\N
f03f17a6-d126-4f45-a1b2-efa57fc2baa7	expense	00019-00003745	2025-07-26 00:00:00	6657f2b5-34e1-4792-8458-5411e9c52a0a	HOLT\nAGRO-COSECHA S.A.	314027.15	32972.85	347000.00	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/2d1bd9ed6fe93851ad188455f72ec067	9Recibidas.jpg	{"invoice_number":"00019-00003745","invoice_class":"A","date":"2025-07-26","total":347000,"client_name":"HOLT\\nAGRO-COSECHA S.A.","supplier_name":"HOLT\\nAGRO-COSECHA S.A.","supplier_cuit":"30-71208699-4","vat_amount":32972.85,"type":"expense","needs_review":false,"detection_method":"header_type_A","description":null,"subtotal":314027.15}	t	2025-09-20 17:20:53.602555	2025-09-20 17:20:53.635	67253	user-test	Joni	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.277	\N	860ab12fb6b26811f3367c5474d46e208556d093d36de8f40246c1f16442e0df	f	95.00	f	approved	\N
f3482440-f916-4061-9e14-7d58947aabf7	expense	5320742646	2025-07-31 00:00:00	1adca01e-af00-4b68-81f2-763dbf5d9dc6	Google®	4.74	0.00	6.00	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/d448af8ee977a2186af7700aaba7a9ed	15Recibidas.pdf	{"invoice_number":"5320742646","invoice_class":"B","date":"2025-07-31","total":6,"client_name":"Google®","supplier_name":"Google®","vat_amount":0,"type":"expense","needs_review":true,"detection_method":"no_vat_conservative_B","description":null}	t	2025-09-20 17:21:39.810201	2025-09-20 17:21:39.848	92721	user-test	Joni	B	0.00	0.00	0.00	paid	2025-09-20 17:25:38.192	\N	55dd63d5b73d2bbe96e300a4934894a5cec233d57109906fc3cb585582882fe8	t	95.00	f	approved	\N
345cd4e9-0b36-49b6-af08-2bc4e7ba3643	expense	00000013	2025-07-21 00:00:00	de08eeb1-eb31-48a6-9ddc-89fc7d93c20e	Magistretti Gonzalez Lucas	22892.56	4807.44	27700.00	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/cc2d150706cfff19fdd67baf7ac6b21f	8Recibidas.jpg	{"invoice_number":"00000013","invoice_class":"A","date":"2025-07-21","total":27700,"client_name":"Magistretti Gonzalez Lucas","supplier_name":"Magistretti Gonzalez Lucas","supplier_cuit":"20367463245","vat_amount":4807.44,"type":"expense","needs_review":false,"detection_method":"header_type_A","description":null,"subtotal":22892.56}	t	2025-09-20 17:19:30.868156	2025-09-20 17:19:30.912	71582	user-test	Hernán	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.298	\N	d3512dec8f7f49ec3dd70ff7cb4f7002afe3dbcc8b5e4367d497981c6ef0f665	f	95.00	f	approved	\N
4367f75d-e6e9-400b-ba16-b8a2f56007f0	expense	0100-00104041	2025-07-29 00:00:00	1a0f1389-b5c7-4589-8f60-06dca179ed00	despegar	234667.94	21633.43	256301.37	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/fe3c7cc7648b331c3ea46ca93c7ea568	14Recibidas.pdf	{"invoice_number":"0100-00104041","invoice_class":"A","date":"2025-07-29","total":256301.37,"client_name":"despegar","supplier_name":"despegar","supplier_cuit":"30-70130711-5","vat_amount":21633.43,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":234667.94}	t	2025-09-20 17:20:20.588804	2025-09-20 17:20:20.625	14260	user-test	Hernán	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.256	\N	5ee89ff954a06709a80c776392f189392bd5bff7892fdd34c47997cf6039f48a	f	95.00	f	approved	\N
75453f2b-5602-4b93-b2c2-0de145199aa7	expense	00230 00010198	2025-07-31 00:00:00	a2fbdc0c-555c-4453-8c14-d6429adb66f2	ALLUB HERMANOS S.R.L.	42668.46	7331.49	49999.95	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/ba0c2cc8d99021a77c874bc3e7db03eb	11Recibidas.jpg	{"invoice_number":"00230 00010198","invoice_class":"A","date":"2025-07-31","total":49999.95,"client_name":"ALLUB HERMANOS S.R.L.","supplier_name":"ALLUB HERMANOS S.R.L.","supplier_cuit":"30-52765133-2","vat_amount":7331.49,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":42668.46}	t	2025-09-20 17:21:34.020583	2025-09-20 17:21:34.056	108887	user-test	Joni	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.171	\N	cc686cf601d75679acf6a199ac50c0e2428143b4daa6a8892c1b86dd5d8fa3ed	f	95.00	f	approved	\N
11ec02af-605e-49d8-9b6e-2a79833518e1	expense	00230-00010198	2025-07-31 00:00:00	829a6dea-1228-43e3-81d4-1471f67cab40	ALLUB HERMANOS S.R.L. PIROVANO	42668.46	7331.49	49999.95	user-test	Franco Nicolás Corts Romeo	/home/runner/workspace/uploads/d92419b03ff82a9daa71fae05a947e96	10Recibidas.jpg	{"invoice_number":"00230-00010198","invoice_class":"A","date":"2025-07-31","total":49999.95,"client_name":"ALLUB HERMANOS S.R.L. PIROVANO","supplier_name":"ALLUB HERMANOS S.R.L. PIROVANO","supplier_cuit":"30-52765133-2","vat_amount":7331.49,"type":"expense","needs_review":false,"detection_method":"fiscal_rule_RI_to_RI","description":null,"subtotal":42668.46}	t	2025-09-20 17:19:54.790152	2025-09-20 17:19:54.825	99050	user-test	Hernán	A	0.00	0.00	0.00	paid	2025-09-20 17:25:38.213	\N	75b2b179c5d72e79a45034b82c0a422cdc4c54c8b0f1f48fff90ad97f63311da	f	95.00	f	approved	\N
\.


--
-- Data for Name: iva_components; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.iva_components (id, invoice_id, description, percentage, amount, created_at) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
x48G9ghEExj2cQRgcjlSXFfdFytM9Cpy	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-10-20T00:43:30.252Z","secure":false,"httpOnly":true,"path":"/"},"user":{"id":"user-test","displayName":"Franco Nicolás Corts Romeo","email":"cortsfranco@hotmail.com","role":"admin","avatar":"/uploads/avatars/avatar-user-test-1758259655620.jpeg","decimalSeparator":",","thousandSeparator":".","decimalPlaces":2,"currencySymbol":"$","currencyPosition":"before","roundingMode":"round","fiscalPeriod":"calendar"}}	2025-10-20 00:45:39
Ll6oexUVJJ7YO4rHGjz0ECQj4FlaFgzF	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-10-20T00:15:59.128Z","secure":false,"httpOnly":true,"path":"/"},"user":{"id":"user-test","displayName":"Franco Nicolás Corts Romeo","email":"cortsfranco@hotmail.com","role":"admin","avatar":"/uploads/avatars/avatar-user-test-1758259655620.jpeg","decimalSeparator":",","thousandSeparator":".","decimalPlaces":2,"currencySymbol":"$","currencyPosition":"before","roundingMode":"round","fiscalPeriod":"calendar"}}	2025-10-20 13:38:05
LkwB0Mh_UeOfuVL96JpF5PnKGzYt0eku	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-10-20T00:23:38.669Z","secure":false,"httpOnly":true,"path":"/"},"user":{"id":"user-test","displayName":"Franco Nicolás Corts Romeo","email":"cortsfranco@hotmail.com","role":"admin","avatar":"/uploads/avatars/avatar-user-test-1758259655620.jpeg","decimalSeparator":",","thousandSeparator":".","decimalPlaces":2,"currencySymbol":"$","currencyPosition":"before","roundingMode":"round","fiscalPeriod":"calendar"}}	2025-10-20 00:28:52
i79n0Ndd68y2fkUhItOtXjdqLHIEnmlX	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-10-20T00:54:59.107Z","secure":false,"httpOnly":true,"path":"/"},"user":{"id":"user-test","displayName":"Franco Nicolás Corts Romeo","email":"cortsfranco@hotmail.com","role":"admin","avatar":"/uploads/avatars/avatar-user-test-1758259655620.jpeg","decimalSeparator":",","thousandSeparator":".","decimalPlaces":2,"currencySymbol":"$","currencyPosition":"before","roundingMode":"round","fiscalPeriod":"calendar"}}	2025-10-20 00:55:57
YhO7-nB2-B-IEP1tCMOsENYcUrNN4zJN	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-10-20T16:33:18.041Z","secure":false,"httpOnly":true,"path":"/"},"user":{"id":"user-test","displayName":"Franco Nicolás Corts Romeo","email":"cortsfranco@hotmail.com","role":"admin","avatar":"/uploads/avatars/avatar-user-test-1758259655620.jpeg","decimalSeparator":",","thousandSeparator":".","decimalPlaces":2,"currencySymbol":"$","currencyPosition":"before","roundingMode":"round","fiscalPeriod":"calendar"}}	2025-10-20 17:38:56
DrKXeu7An_lpDbszi4whQMWjF07pF-3J	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-10-20T00:18:10.753Z","secure":false,"httpOnly":true,"path":"/"},"user":{"id":"user-test","displayName":"Franco Nicolás Corts Romeo","email":"cortsfranco@hotmail.com","role":"admin","avatar":"/uploads/avatars/avatar-user-test-1758259655620.jpeg","decimalSeparator":",","thousandSeparator":".","decimalPlaces":2,"currencySymbol":"$","currencyPosition":"before","roundingMode":"round","fiscalPeriod":"calendar"}}	2025-10-20 08:39:22
oy_kxuHP4fjhRw8_qbDymFbIuUl6EdvJ	{"cookie":{"originalMaxAge":2592000000,"expires":"2025-10-19T23:01:43.239Z","secure":false,"httpOnly":true,"path":"/"},"user":{"id":"user-test","displayName":"Franco Nicolás Corts Romeo","email":"cortsfranco@hotmail.com","role":"admin","avatar":"/uploads/avatars/avatar-user-test-1758259655620.jpeg","decimalSeparator":",","thousandSeparator":".","decimalPlaces":2,"currencySymbol":"$","currencyPosition":"before","roundingMode":"round","fiscalPeriod":"calendar"}}	2025-10-20 21:32:36
\.


--
-- Data for Name: upload_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.upload_jobs (id, user_id, file_name, file_size, fingerprint, status, invoice_id, error, file_path, uploaded_by_name, owner_name, retry_count, max_retries, last_retry_at, quarantined_at, created_at, updated_at) FROM stdin;
b2d41194-6212-41df-abe0-7e2d65555e78	user-test	8Recibidas.jpg	71582	d3512dec8f7f49ec3dd70ff7cb4f7002afe3dbcc8b5e4367d497981c6ef0f665	success	345cd4e9-0b36-49b6-af08-2bc4e7ba3643	\N	/home/runner/workspace/uploads/cc2d150706cfff19fdd67baf7ac6b21f	Franco Nicolás Corts Romeo	Hernán	0	3	\N	\N	2025-09-20 17:19:09.542	2025-09-20 17:19:30.96
b28b128c-3998-4c6d-b1f7-9bff64052224	user-test	1Recibidas.pdf	55944	2c6f7c9918d3a9010699c2f73e10b03e33aed4cca6b8b391e71d376e07c887e9	success	0f36aaa3-6f37-4b99-b1d5-92d9c69fcdb0	\N	/home/runner/workspace/uploads/a1ce35b72975fbd342086ef3ad05e8e8	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:17:34.566	2025-09-20 17:17:40.189
dfb64d88-a664-4977-ac40-c946aa67d636	user-test	1Emitidas.pdf	92776	28079dc508ebc0129d1756545a5a44e02f923e9b0497d6545bb0ba44bd826907	success	5c776833-a735-448b-aa2c-5c839d537a23	\N	/home/runner/workspace/uploads/b5669aed54c3fe060a7bdce7d1eba560	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:16:23.336	2025-09-20 17:16:29.244
2ead2ad9-7dc6-4fd9-81da-3504331aad03	user-test	5Recibidas.jpg	76773	475a224855a08f6212233686cd0e0443591c01c432124b39eaa02b3bc60b8e1f	success	9827e65b-cba4-46f2-82d3-e946258f41de	\N	/home/runner/workspace/uploads/84ced09682aabb553eca259a2a395969	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:17:34.613	2025-09-20 17:17:52.943
d0b54335-6832-4073-8899-4d2af8e010f3	user-test	2Emitidas.pdf	66922	f482d5d88e13fd4c941e5044919551d128363fa8c82a68e75aee763ce6803d93	success	20de3fe2-7d84-49b3-97a0-3206bdff944e	\N	/home/runner/workspace/uploads/c24d36651fa1feecf06e657486a3fbef	Franco Nicolás Corts Romeo	Hernán	0	3	\N	\N	2025-09-20 17:16:42.166	2025-09-20 17:16:57.954
cccc6471-30f0-4d72-b040-980b572a9296	user-test	7Recibidas.jpg	104905	44d626a24cac87b8b07afbff81f8a02ebb9d2f28fe8179de8b0c9ddcf37606b9	success	e32128ba-a5f5-4de4-a3fd-9167dd211d7d	\N	/home/runner/workspace/uploads/ff18281a88ee265ea89f87aa7f649e49	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:17:34.636	2025-09-20 17:17:58.074
40dc4deb-3348-42cd-9f4c-b838b9129609	user-test	2Recibidas.jpg	95243	5b2c7b5c7447d741894c6aaa3a9e596d9e9dad12ef80f04a6d2c4f75b0769428	success	73557bbb-b9fb-43c2-94ca-649bf04a79a3	\N	/home/runner/workspace/uploads/4b4141972874717387974567e6f4b894	Franco Nicolás Corts Romeo	Hernán	0	3	\N	\N	2025-09-20 17:17:07.923	2025-09-20 17:17:23.723
f115d28c-fe8a-41e5-8544-0104a9a39cf4	user-test	3Recibidas.jpg	123437	9dfeeb03111c957bb4c266352beacc60d03af199dca97eb496cb3e1cb98f7cfb	success	12d4afcd-3fcb-45a8-8a9b-599c2f0be86c	\N	/home/runner/workspace/uploads/de9df32afbfa7c72a2e0c1f90d15b773	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:17:34.59	2025-09-20 17:18:09.127
a05d00f5-4fd1-4ef9-bff5-8816ee5fb7e7	user-test	4Recibidas.jpg	81745	6a61339de905b1383b954ef634bf45bcabb558a369b96a536a0d384d338ce91f	success	9eae89c2-fec2-4ee4-a6db-6bd1c8f0373f	\N	/home/runner/workspace/uploads/763e8178a11bb3c106f72e99bd59bda8	Franco Nicolás Corts Romeo	Hernán	0	3	\N	\N	2025-09-20 17:19:09.285	2025-09-20 17:19:20.123
990d5a17-3fce-4143-8fc3-0c0479c7c5f7	user-test	6Recibidas.jpg	95009	faaafcfc522d806992cc17988cc8ec442b4ca2c72d841722758fe1f2af514e6c	success	0298c0fc-e0ae-4a0b-8cab-faed9e7a3581	\N	/home/runner/workspace/uploads/8ba63ad281f130641b77801999d84258	Franco Nicolás Corts Romeo	Hernán	0	3	\N	\N	2025-09-20 17:19:09.426	2025-09-20 17:19:30.862
cbeb0e25-ecd0-4525-a396-b6eca3499b9d	user-test	10Recibidas.jpg	99050	75b2b179c5d72e79a45034b82c0a422cdc4c54c8b0f1f48fff90ad97f63311da	success	11ec02af-605e-49d8-9b6e-2a79833518e1	\N	/home/runner/workspace/uploads/d92419b03ff82a9daa71fae05a947e96	Franco Nicolás Corts Romeo	Hernán	0	3	\N	\N	2025-09-20 17:19:44.111	2025-09-20 17:19:54.873
c00173aa-6793-4b2a-bfaa-33c16f46af28	user-test	11Recibidas.jpg	108887	cc686cf601d75679acf6a199ac50c0e2428143b4daa6a8892c1b86dd5d8fa3ed	success	75453f2b-5602-4b93-b2c2-0de145199aa7	\N	/home/runner/workspace/uploads/ba0c2cc8d99021a77c874bc3e7db03eb	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:21:28.43	2025-09-20 17:21:34.109
3e00b9cd-eae6-4725-a3a1-92ec30f12b21	user-test	9Recibidas.jpg	67253	860ab12fb6b26811f3367c5474d46e208556d093d36de8f40246c1f16442e0df	success	f03f17a6-d126-4f45-a1b2-efa57fc2baa7	\N	/home/runner/workspace/uploads/2d1bd9ed6fe93851ad188455f72ec067	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:20:42.905	2025-09-20 17:20:53.682
297de7e1-fff6-4170-ba9e-895296b20b46	user-test	12Recibidas.jpg	74349	1ef61dae89dbd79b0e3d321edb3b61eedc67340ef5a3bd3c9503533a451c211d	success	b2a3e6d6-10e6-4474-b5f8-25e4928d8c55	\N	/home/runner/workspace/uploads/a8a2be5e2fb528cb41f727b4d27299dc	Franco Nicolás Corts Romeo	Hernán	0	3	\N	\N	2025-09-20 17:19:44.14	2025-09-20 17:20:20.578
7b6b8240-0ff6-4e32-ae26-469c8226d781	user-test	14Recibidas.pdf	14260	5ee89ff954a06709a80c776392f189392bd5bff7892fdd34c47997cf6039f48a	success	4367f75d-e6e9-400b-ba16-b8a2f56007f0	\N	/home/runner/workspace/uploads/fe3c7cc7648b331c3ea46ca93c7ea568	Franco Nicolás Corts Romeo	Hernán	0	3	\N	\N	2025-09-20 17:19:44.249	2025-09-20 17:20:20.67
d01e4cd6-1b90-4589-a098-be7d5bca3a3f	user-test	15Recibidas.pdf	92721	55dd63d5b73d2bbe96e300a4934894a5cec233d57109906fc3cb585582882fe8	success	f3482440-f916-4061-9e14-7d58947aabf7	\N	/home/runner/workspace/uploads/d448af8ee977a2186af7700aaba7a9ed	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:21:28.582	2025-09-20 17:21:39.899
2a4adb21-f79b-41d3-8d8d-9db596fe5d7d	user-test	13Recibidas.pdf	29797	dda16c8ff93987dd2f911e2fd89306c5d81131939e2e89ebecf499fe292a7197	success	4ecaad71-7751-4f1f-8d44-3170f304b31c	\N	/home/runner/workspace/uploads/3a5e2affb52bf4c16f00974b55ecfa4a	Franco Nicolás Corts Romeo	Joni	0	3	\N	\N	2025-09-20 17:21:28.455	2025-09-20 17:21:39.773
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, display_name, email, password, created_at, role, is_active, last_login_at, avatar, fiscal_period, decimal_separator, thousand_separator, decimal_places, currency_symbol, currency_position, rounding_mode, company_logo) FROM stdin;
45f18dc0-df38-4109-9714-1239b8a5de01	joni	Joni	joni@opendoors.com	$2b$10$QT8VsYWqREu92r3TV7HHEu3WF467neb4MDH996rSjryeo1kBIi.N.	2025-09-19 04:17:11.58385	editor	t	\N	\N	calendar	,	.	2	$	before	round	\N
9690c6a3-9603-434c-87c9-a1506a967c5b	hernan	Hernan	hernan@opendoors.com	$2b$10$E4/RLYQA4B9hBMZjfHYVoePkr/So0P56F0VbQ4pAnOUptdHQzUkOy	2025-09-19 04:17:11.690168	editor	t	\N	\N	calendar	,	.	2	$	before	round	\N
user-test	franco	Franco Nicolás Corts Romeo	cortsfranco@hotmail.com	$2b$10$8P/drSdfphT9BYt1TW4ULOPcrkZk/JDfUEjp06z9.YV.g0vctz1Ce	2025-09-18 18:34:18.820942	admin	t	2025-09-20 16:32:59.67	/uploads/avatars/avatar-user-test-1758259655620.jpeg	calendar	,	.	2	$	before	round	\N
\.


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_feedback ai_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_pkey PRIMARY KEY (id);


--
-- Name: clients_providers clients_providers_cuit_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients_providers
    ADD CONSTRAINT clients_providers_cuit_unique UNIQUE (cuit);


--
-- Name: clients_providers clients_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients_providers
    ADD CONSTRAINT clients_providers_pkey PRIMARY KEY (id);


--
-- Name: deleted_invoices_log deleted_invoices_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deleted_invoices_log
    ADD CONSTRAINT deleted_invoices_log_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_fingerprint_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_fingerprint_key UNIQUE (fingerprint);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: iva_components iva_components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.iva_components
    ADD CONSTRAINT iva_components_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: upload_jobs upload_jobs_fingerprint_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_jobs
    ADD CONSTRAINT upload_jobs_fingerprint_unique UNIQUE (fingerprint);


--
-- Name: upload_jobs upload_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_jobs
    ADD CONSTRAINT upload_jobs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: idx_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_expire ON public.session USING btree (expire);


--
-- Name: invoices_fingerprint_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX invoices_fingerprint_unique ON public.invoices USING btree (fingerprint) WHERE (fingerprint IS NOT NULL);


--
-- Name: activity_logs activity_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_feedback ai_feedback_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: ai_feedback ai_feedback_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: deleted_invoices_log deleted_invoices_log_deleted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deleted_invoices_log
    ADD CONSTRAINT deleted_invoices_log_deleted_by_users_id_fk FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_client_provider_id_clients_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_provider_id_clients_providers_id_fk FOREIGN KEY (client_provider_id) REFERENCES public.clients_providers(id);


--
-- Name: invoices invoices_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: invoices invoices_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: iva_components iva_components_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.iva_components
    ADD CONSTRAINT iva_components_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: upload_jobs upload_jobs_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_jobs
    ADD CONSTRAINT upload_jobs_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: upload_jobs upload_jobs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.upload_jobs
    ADD CONSTRAINT upload_jobs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict fYUx0zGGxpjeJgcywFKdgIXst8fhCJOxaGeMqzhmO2PbcAQgii72XNzlbzp8tyV

