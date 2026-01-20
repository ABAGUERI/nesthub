


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cleanup_old_weekly_menus"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM weekly_menu
  WHERE week_start < NOW() - INTERVAL '8 weeks';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_weekly_menus"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_config"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Créer config par défaut
  INSERT INTO client_config (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_config"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Créer le profil avec des valeurs par défaut
  -- Ces valeurs seront mises à jour pendant l'onboarding
  INSERT INTO public.profiles (id, first_name, last_name, city, postal_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'postal_code', '')
  );
  
  -- Créer la config par défaut
  INSERT INTO public.client_config (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."savings_project_saved_amount"("p_project_id" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(amount), 0)::numeric
  from savings_contributions
  where project_id = p_project_id
$$;


ALTER FUNCTION "public"."savings_project_saved_amount"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_rotation_assignments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_rotation_assignments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_savings_projects_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  fields jsonb := '{}'::jsonb;
  action_name text;
begin
  if tg_op = 'INSERT' then
    action_name := 'create';

    fields := jsonb_build_object(
      'name', jsonb_build_object('old', null, 'new', new.name),
      'target_amount', jsonb_build_object('old', null, 'new', new.target_amount),
      'emoji', jsonb_build_object('old', null, 'new', new.emoji),
      'status', jsonb_build_object('old', null, 'new', new.status)
    );

    insert into savings_project_audit(project_id, family_member_id, action, changed_fields)
    values (new.id, new.family_member_id, action_name, fields);

    return new;
  end if;

  -- UPDATE
  action_name := 'update';

  -- Status transitions for nicer action labels
  if new.status is distinct from old.status then
    if old.status = 'active' and new.status = 'archived' then
      action_name := 'archive';
    elsif old.status = 'archived' and new.status = 'active' then
      action_name := 'unarchive';
    elsif old.status <> 'completed' and new.status = 'completed' then
      action_name := 'complete';
    end if;
  end if;

  -- Capture only changed fields
  if new.name is distinct from old.name then
    fields := fields || jsonb_build_object('name', jsonb_build_object('old', old.name, 'new', new.name));
  end if;

  if new.target_amount is distinct from old.target_amount then
    fields := fields || jsonb_build_object('target_amount', jsonb_build_object('old', old.target_amount, 'new', new.target_amount));
  end if;

  if new.emoji is distinct from old.emoji then
    fields := fields || jsonb_build_object('emoji', jsonb_build_object('old', old.emoji, 'new', new.emoji));
  end if;

  if new.status is distinct from old.status then
    fields := fields || jsonb_build_object('status', jsonb_build_object('old', old.status, 'new', new.status));
  end if;

  if new.priority is distinct from old.priority then
    fields := fields || jsonb_build_object('priority', jsonb_build_object('old', old.priority, 'new', new.priority));
  end if;

  -- Insert audit row only if something changed
  if fields <> '{}'::jsonb then
    insert into savings_project_audit(project_id, family_member_id, action, changed_fields)
    values (new.id, new.family_member_id, action_name, fields);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_savings_projects_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_savings_projects_limit_active"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  active_count int;
begin
  -- Only enforce when the incoming row is ACTIVE
  if new.status = 'active' then
    select count(*)
      into active_count
    from savings_projects
    where family_member_id = new.family_member_id
      and status = 'active'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if active_count >= 8 then
      raise exception 'LIMIT_ACTIVE_PROJECTS_REACHED: max 8 active projects. Archive one before creating/activating a new one.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_savings_projects_limit_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_savings_projects_target_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  saved numeric;
  pid uuid;
begin
  -- Determine project id (insert has id via default in most cases)
  pid := coalesce(new.id, old.id);

  -- Only check when target_amount changes or on insert
  if tg_op = 'INSERT' or new.target_amount is distinct from old.target_amount then
    -- If pid is null (very rare), treat saved=0
    if pid is null then
      saved := 0;
    else
      saved := savings_project_saved_amount(pid);
    end if;

    if new.target_amount < coalesce(saved, 0) then
      raise exception 'TARGET_BELOW_SAVED_NOT_ALLOWED: target_amount (%) cannot be below saved_amount (%).',
        new.target_amount, coalesce(saved, 0);
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_savings_projects_target_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_family_settings" (
    "user_id" "uuid" NOT NULL,
    "adults" integer DEFAULT 2 NOT NULL,
    "children" integer DEFAULT 3 NOT NULL,
    "restrictions" "text"[] DEFAULT '{}'::"text"[],
    "favorite_ingredients" "text"[] DEFAULT '{}'::"text"[],
    "preferred_cuisines" "text"[] DEFAULT '{}'::"text"[],
    "budget_cad" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_family_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_family_settings" IS 'Paramètres famille pour génération Menu IA (personnes, restrictions, préférences)';



COMMENT ON COLUMN "public"."ai_family_settings"."adults" IS 'Nombre adultes dans la famille';



COMMENT ON COLUMN "public"."ai_family_settings"."children" IS 'Nombre enfants dans la famille';



COMMENT ON COLUMN "public"."ai_family_settings"."restrictions" IS 'Restrictions alimentaires (vegetarian, vegan, gluten_free, lactose_free, no_pork, halal, kosher, custom)';



COMMENT ON COLUMN "public"."ai_family_settings"."favorite_ingredients" IS 'Liste ingrédients favoris';



COMMENT ON COLUMN "public"."ai_family_settings"."preferred_cuisines" IS 'Types de cuisine préférés (french, italian, asian, mediterranean, mexican)';



COMMENT ON COLUMN "public"."ai_family_settings"."budget_cad" IS 'Budget hebdomadaire en CAD (optionnel)';



CREATE TABLE IF NOT EXISTS "public"."ai_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "feature" "text" NOT NULL,
    "model" "text" NOT NULL,
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "cost" numeric(10,6) DEFAULT 0 NOT NULL,
    "cached" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" character varying(100) NOT NULL,
    "total_tokens" integer DEFAULT 0 NOT NULL,
    "estimated_cost_usd" numeric(10,6) DEFAULT 0 NOT NULL,
    "status" character varying(20) DEFAULT 'success'::character varying NOT NULL,
    "error_message" "text",
    CONSTRAINT "ai_usage_logs_feature_check" CHECK (("feature" = ANY (ARRAY['menu_generation'::"text", 'menu_chat'::"text", 'fridge_optimization'::"text"]))),
    CONSTRAINT "valid_status" CHECK ((("status")::"text" = ANY ((ARRAY['success'::character varying, 'error'::character varying, 'partial'::character varying])::"text"[])))
);


ALTER TABLE "public"."ai_usage_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_usage_logs" IS 'Logs d''utilisation API Claude Anthropic pour tracking coûts et monitoring usage';



COMMENT ON COLUMN "public"."ai_usage_logs"."feature" IS 'Feature utilisée (ex: menu_generation, recipe_suggestion)';



COMMENT ON COLUMN "public"."ai_usage_logs"."model" IS 'Modèle IA utilisé (ex: claude-sonnet-4)';



COMMENT ON COLUMN "public"."ai_usage_logs"."input_tokens" IS 'Nombre de tokens envoyés à l''API (prompt)';



COMMENT ON COLUMN "public"."ai_usage_logs"."output_tokens" IS 'Nombre de tokens reçus de l''API (réponse)';



COMMENT ON COLUMN "public"."ai_usage_logs"."cost" IS 'Coût en USD de cet appel';



COMMENT ON COLUMN "public"."ai_usage_logs"."cached" IS 'True si réponse servie du cache (coût = 0)';



COMMENT ON COLUMN "public"."ai_usage_logs"."action" IS 'Action spécifique (ex: generate_week_menu, get_recipe_ideas)';



COMMENT ON COLUMN "public"."ai_usage_logs"."estimated_cost_usd" IS 'Coût estimé en USD basé sur tarification Anthropic Claude Sonnet 4';



CREATE OR REPLACE VIEW "public"."ai_usage_by_user" AS
 SELECT "user_id",
    "count"(*) AS "total_generations",
    "sum"("total_tokens") AS "total_tokens",
    "sum"("estimated_cost_usd") AS "total_cost_usd",
    "min"("created_at") AS "first_usage",
    "max"("created_at") AS "last_usage",
    "date_trunc"('month'::"text", "max"("created_at")) AS "current_month"
   FROM "public"."ai_usage_logs"
  WHERE (("status")::"text" = 'success'::"text")
  GROUP BY "user_id", ("date_trunc"('month'::"text", "created_at"))
  ORDER BY ("sum"("estimated_cost_usd")) DESC;


ALTER VIEW "public"."ai_usage_by_user" OWNER TO "postgres";


COMMENT ON VIEW "public"."ai_usage_by_user" IS 'Vue coûts totaux par utilisateur pour billing et monitoring';



CREATE OR REPLACE VIEW "public"."ai_usage_stats" AS
 SELECT "user_id",
    "date_trunc"('month'::"text", "created_at") AS "month",
    "feature",
    "count"(*) AS "total_calls",
    "sum"(
        CASE
            WHEN "cached" THEN 1
            ELSE 0
        END) AS "cached_calls",
    "sum"("input_tokens") AS "total_input_tokens",
    "sum"("output_tokens") AS "total_output_tokens",
    "sum"("cost") AS "total_cost"
   FROM "public"."ai_usage_logs"
  GROUP BY "user_id", ("date_trunc"('month'::"text", "created_at")), "feature";


ALTER VIEW "public"."ai_usage_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."ai_usage_stats" IS 'Statistiques mensuelles d''usage IA par utilisateur et feature';



CREATE OR REPLACE VIEW "public"."ai_usage_summary" AS
 SELECT "user_id",
    "feature",
    "action",
    "count"(*) AS "total_calls",
    "sum"("input_tokens") AS "total_input_tokens",
    "sum"("output_tokens") AS "total_output_tokens",
    "sum"("total_tokens") AS "total_tokens",
    "sum"("estimated_cost_usd") AS "total_cost_usd",
    "avg"("estimated_cost_usd") AS "avg_cost_per_call",
    "min"("created_at") AS "first_call",
    "max"("created_at") AS "last_call",
    "date_trunc"('day'::"text", "created_at") AS "date"
   FROM "public"."ai_usage_logs"
  WHERE (("status")::"text" = 'success'::"text")
  GROUP BY "user_id", "feature", "action", ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC, ("sum"("estimated_cost_usd")) DESC;


ALTER VIEW "public"."ai_usage_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."ai_usage_summary" IS 'Vue agrégée des coûts API Claude par utilisateur, feature et jour';



CREATE TABLE IF NOT EXISTS "public"."allowance_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_member_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "source" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "validated_by_parent" boolean DEFAULT true NOT NULL,
    CONSTRAINT "allowance_transactions_amount_check" CHECK (("amount" <> (0)::numeric)),
    CONSTRAINT "allowance_transactions_source_check" CHECK (("source" = ANY (ARRAY['pocket_money'::"text", 'reward'::"text", 'gift'::"text", 'parent_adjustment'::"text", 'purchase'::"text"])))
);


ALTER TABLE "public"."allowance_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."available_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "points" integer DEFAULT 10,
    "money_value" numeric(5,2) DEFAULT 0.00,
    "icon" "text",
    "category" "text" DEFAULT 'daily'::"text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "child_id" "uuid"
);


ALTER TABLE "public"."available_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_progress" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "total_points" integer DEFAULT 0,
    "current_level" integer DEFAULT 1,
    "money_balance" numeric(6,2) DEFAULT 0.00,
    "badges_earned" "text"[] DEFAULT ARRAY[]::"text"[],
    "total_tasks_completed" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "target_points" integer DEFAULT 1000 NOT NULL
);


ALTER TABLE "public"."child_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."children_save" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "role" "text",
    "avatar_url" "text",
    CONSTRAINT "children_icon_check" CHECK (("icon" = ANY (ARRAY['bee'::"text", 'ladybug'::"text", 'butterfly'::"text", 'caterpillar'::"text"]))),
    CONSTRAINT "children_role_check" CHECK (("role" = ANY (ARRAY['child'::"text", 'adult'::"text"])))
);


ALTER TABLE "public"."children_save" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_config" (
    "user_id" "uuid" NOT NULL,
    "module_calendar" boolean DEFAULT true,
    "module_tasks" boolean DEFAULT true,
    "module_weather" boolean DEFAULT true,
    "module_stocks" boolean DEFAULT false,
    "module_vehicle" boolean DEFAULT false,
    "module_photos" boolean DEFAULT true,
    "module_children_rewards" boolean DEFAULT false,
    "module_screen_time" boolean DEFAULT false,
    "weather_city" "text",
    "weather_postal_code" "text",
    "reward_system" "text" DEFAULT 'points'::"text",
    "reward_points_to_money_rate" integer DEFAULT 20,
    "reward_enable_levels" boolean DEFAULT false,
    "reward_enable_badges" boolean DEFAULT false,
    "reward_levels_enabled" boolean DEFAULT false,
    "reward_auto_convert_points" boolean DEFAULT true,
    "screen_time_mode" "text" DEFAULT 'manual'::"text",
    "screen_time_default_allowance" integer DEFAULT 60,
    "screen_time_use_lives" boolean DEFAULT true,
    "stock_symbols" "text"[] DEFAULT ARRAY['BTC-USD'::"text", 'AAPL'::"text", 'GOOGL'::"text", 'MSFT'::"text", 'NVDA'::"text"],
    "stock_refresh_interval" integer DEFAULT 30,
    "vehicle_brand" "text",
    "vehicle_api_configured" boolean DEFAULT false,
    "photos_slideshow_interval" integer DEFAULT 120,
    "photos_folder_id" "text",
    "google_calendar_id" "text",
    "google_calendar_name" "text",
    "google_grocery_list_id" "text",
    "google_grocery_list_name" "text" DEFAULT 'Épicerie'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "rotation_reset_day" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "client_config_reward_system_check" CHECK (("reward_system" = ANY (ARRAY['points'::"text", 'money'::"text", 'hybrid'::"text", 'none'::"text"]))),
    CONSTRAINT "client_config_screen_time_mode_check" CHECK (("screen_time_mode" = ANY (ARRAY['manual'::"text", 'semi-auto'::"text", 'disabled'::"text"]))),
    CONSTRAINT "client_config_vehicle_brand_check" CHECK ((("vehicle_brand" = ANY (ARRAY['tesla'::"text", 'byd'::"text", 'generic'::"text"])) OR ("vehicle_brand" IS NULL)))
);


ALTER TABLE "public"."client_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."completed_tasks" (
    "id" "uuid" NOT NULL,
    "child_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "task_name" "text" NOT NULL,
    "points_earned" integer NOT NULL,
    "money_earned" numeric DEFAULT 0 NOT NULL,
    "completed_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."completed_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."family_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "role" "text" DEFAULT 'child'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "birth_date" "date",
    CONSTRAINT "family_members_birth_date_plausible" CHECK ((("birth_date" IS NULL) OR (("birth_date" <= CURRENT_DATE) AND ("birth_date" >= '1900-01-01'::"date")))),
    CONSTRAINT "family_members_icon_check" CHECK (("icon" = ANY (ARRAY['bee'::"text", 'ladybug'::"text", 'butterfly'::"text", 'caterpillar'::"text"]))),
    CONSTRAINT "family_members_role_check" CHECK (("role" = ANY (ARRAY['child'::"text", 'adult'::"text"])))
);


ALTER TABLE "public"."family_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_connections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "gmail_address" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "token_expires_at" timestamp without time zone,
    "selected_calendar_id" "text",
    "selected_calendar_name" "text",
    "grocery_list_id" "text",
    "grocery_list_name" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "scope" "text"
);


ALTER TABLE "public"."google_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "has_children" boolean DEFAULT false,
    "trial_ends_at" timestamp without time zone DEFAULT ("now"() + '30 days'::interval),
    "subscription_status" "text" DEFAULT 'trial'::"text",
    "onboarding_completed" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "profiles_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['trial'::"text", 'active'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_levels" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "level_number" integer NOT NULL,
    "level_name" "text" NOT NULL,
    "points_min" integer NOT NULL,
    "points_max" integer NOT NULL,
    "badge_icon" "text" NOT NULL,
    "money_reward" numeric(5,2) DEFAULT 0.00,
    "badge_color" "text" DEFAULT '#94a3b8'::"text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "reward_levels_badge_icon_check" CHECK (("badge_icon" = ANY (ARRAY['bronze'::"text", 'silver'::"text", 'gold'::"text", 'diamond'::"text"])))
);


ALTER TABLE "public"."reward_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_levels_template" (
    "level_number" integer NOT NULL,
    "level_name" "text" NOT NULL,
    "points_min" integer NOT NULL,
    "points_max" integer NOT NULL,
    "badge_icon" "text" NOT NULL,
    "money_reward" numeric(5,2) NOT NULL,
    "badge_color" "text" NOT NULL
);


ALTER TABLE "public"."reward_levels_template" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rotation_assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "week_start" timestamp with time zone NOT NULL,
    "child_id" "uuid" NOT NULL,
    "adjusted" boolean,
    "note" "text",
    "rule" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sort_order" integer DEFAULT 0,
    "attempts_used" integer DEFAULT 0 NOT NULL,
    "task_id" "uuid",
    CONSTRAINT "attempts_used_range" CHECK ((("attempts_used" >= 0) AND ("attempts_used" <= 3)))
);


ALTER TABLE "public"."rotation_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."rotation_assignments" IS 'Gère les assignations de tâches rotatives hebdomadaires';



COMMENT ON COLUMN "public"."rotation_assignments"."attempts_used" IS 'Nombre de tentatives de rotation utilisées dans la période courante (max 3)';



CREATE TABLE IF NOT EXISTS "public"."rotation_completions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "child_id" "uuid",
    "task_id" "uuid",
    "assignment_id" "uuid",
    "completed_at" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."rotation_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rotation_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "icon" "text",
    "category" "text" DEFAULT 'household'::"text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."rotation_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."savings_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "savings_contributions_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."savings_contributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."savings_project_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "family_member_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "changed_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "changed_by_user_id" "uuid",
    "changed_by_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "savings_project_audit_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'archive'::"text", 'complete'::"text", 'unarchive'::"text"])))
);


ALTER TABLE "public"."savings_project_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."savings_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_member_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "target_amount" numeric(10,2) NOT NULL,
    "image_url" "text",
    "priority" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "emoji" "text" DEFAULT '🎯'::"text",
    CONSTRAINT "savings_projects_emoji_not_blank" CHECK ((("emoji" IS NULL) OR ("length"(TRIM(BOTH FROM "emoji")) > 0))),
    CONSTRAINT "savings_projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'archived'::"text"]))),
    CONSTRAINT "savings_projects_target_amount_check" CHECK (("target_amount" > (0)::numeric))
);


ALTER TABLE "public"."savings_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."screen_time_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "daily_allowance" integer DEFAULT 60,
    "lives_enabled" boolean DEFAULT true,
    "max_lives" integer DEFAULT 3,
    "minutes_per_life" integer DEFAULT 20,
    "penalty_on_exceed" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "weekly_allowance" integer,
    "week_reset_day" integer DEFAULT 1 NOT NULL,
    "hearts_total" integer DEFAULT 5 NOT NULL,
    "hearts_minutes" integer,
    CONSTRAINT "screen_time_hearts_minutes_positive" CHECK ((("hearts_minutes" IS NULL) OR ("hearts_minutes" > 0))),
    CONSTRAINT "screen_time_hearts_total_range" CHECK ((("hearts_total" >= 1) AND ("hearts_total" <= 10))),
    CONSTRAINT "screen_time_week_reset_day_range" CHECK ((("week_reset_day" >= 1) AND ("week_reset_day" <= 7))),
    CONSTRAINT "screen_time_weekly_allowance_positive" CHECK ((("weekly_allowance" IS NULL) OR ("weekly_allowance" >= 0)))
);


ALTER TABLE "public"."screen_time_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."screen_time_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "start_time" timestamp without time zone DEFAULT "now"(),
    "end_time" timestamp without time zone,
    "minutes_used" integer DEFAULT 0,
    "lives_used" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."screen_time_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_lists" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "google_task_list_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'custom'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "task_lists_type_check" CHECK (("type" = ANY (ARRAY['grocery'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."task_lists" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_google_connections_safe" AS
 SELECT "id",
    "user_id",
    "gmail_address",
    "selected_calendar_id",
    "selected_calendar_name",
    "grocery_list_id",
    "grocery_list_name",
    "expires_at",
    "scope",
    "created_at",
    "updated_at"
   FROM "public"."google_connections";


ALTER VIEW "public"."v_google_connections_safe" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_savings_project_progress" AS
 SELECT "p"."id",
    "p"."family_member_id",
    "p"."name",
    "p"."target_amount",
    "p"."image_url",
    "p"."emoji",
    "p"."priority",
    "p"."status",
    "p"."created_at",
    "p"."completed_at",
    (COALESCE("sum"("c"."amount"), (0)::numeric))::numeric(10,2) AS "saved_amount",
    (GREATEST(("p"."target_amount" - COALESCE("sum"("c"."amount"), (0)::numeric)), (0)::numeric))::numeric(10,2) AS "remaining_amount",
    (
        CASE
            WHEN ("p"."target_amount" > (0)::numeric) THEN LEAST(((COALESCE("sum"("c"."amount"), (0)::numeric) / "p"."target_amount") * (100)::numeric), (100)::numeric)
            ELSE (0)::numeric
        END)::numeric(5,2) AS "progress_percent"
   FROM ("public"."savings_projects" "p"
     LEFT JOIN "public"."savings_contributions" "c" ON (("c"."project_id" = "p"."id")))
  GROUP BY "p"."id", "p"."family_member_id", "p"."name", "p"."target_amount", "p"."image_url", "p"."emoji", "p"."priority", "p"."status", "p"."created_at", "p"."completed_at";


ALTER VIEW "public"."v_savings_project_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_menu" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "week_start" timestamp with time zone NOT NULL,
    "day_iso_date" "text" NOT NULL,
    "meals" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weekly_menu" OWNER TO "postgres";


COMMENT ON TABLE "public"."weekly_menu" IS 'Stocke les menus hebdomadaires par jour pour chaque utilisateur';



ALTER TABLE ONLY "public"."ai_family_settings"
    ADD CONSTRAINT "ai_family_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allowance_transactions"
    ADD CONSTRAINT "allowance_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."available_tasks"
    ADD CONSTRAINT "available_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_progress"
    ADD CONSTRAINT "child_progress_child_id_key" UNIQUE ("child_id");



ALTER TABLE ONLY "public"."child_progress"
    ADD CONSTRAINT "child_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."children_save"
    ADD CONSTRAINT "children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_config"
    ADD CONSTRAINT "client_config_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."completed_tasks"
    ADD CONSTRAINT "completed_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_connections"
    ADD CONSTRAINT "google_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_connections"
    ADD CONSTRAINT "google_connections_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_levels"
    ADD CONSTRAINT "reward_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_levels_template"
    ADD CONSTRAINT "reward_levels_template_pkey" PRIMARY KEY ("level_number");



ALTER TABLE ONLY "public"."reward_levels"
    ADD CONSTRAINT "reward_levels_user_id_level_number_key" UNIQUE ("user_id", "level_number");



ALTER TABLE ONLY "public"."rotation_assignments"
    ADD CONSTRAINT "rotation_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rotation_completions"
    ADD CONSTRAINT "rotation_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rotation_tasks"
    ADD CONSTRAINT "rotation_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."savings_contributions"
    ADD CONSTRAINT "savings_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."savings_project_audit"
    ADD CONSTRAINT "savings_project_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."savings_projects"
    ADD CONSTRAINT "savings_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screen_time_config"
    ADD CONSTRAINT "screen_time_config_child_id_key" UNIQUE ("child_id");



ALTER TABLE ONLY "public"."screen_time_config"
    ADD CONSTRAINT "screen_time_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screen_time_sessions"
    ADD CONSTRAINT "screen_time_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_lists"
    ADD CONSTRAINT "task_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_menu"
    ADD CONSTRAINT "weekly_menu_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_menu"
    ADD CONSTRAINT "weekly_menu_user_id_week_start_day_iso_date_key" UNIQUE ("user_id", "week_start", "day_iso_date");



CREATE INDEX "ai_usage_logs_created_at_idx" ON "public"."ai_usage_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "ai_usage_logs_feature_idx" ON "public"."ai_usage_logs" USING "btree" ("feature");



CREATE INDEX "ai_usage_logs_user_id_idx" ON "public"."ai_usage_logs" USING "btree" ("user_id");



CREATE INDEX "allowance_transactions_member_idx" ON "public"."allowance_transactions" USING "btree" ("family_member_id", "created_at" DESC);



CREATE INDEX "family_members_birth_date_idx" ON "public"."family_members" USING "btree" ("birth_date");



CREATE INDEX "google_connections_user_id_idx" ON "public"."google_connections" USING "btree" ("user_id");



CREATE INDEX "idx_ai_family_settings_user" ON "public"."ai_family_settings" USING "btree" ("user_id");



CREATE INDEX "idx_ai_usage_feature" ON "public"."ai_usage_logs" USING "btree" ("feature", "created_at" DESC);



CREATE INDEX "idx_ai_usage_status" ON "public"."ai_usage_logs" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_ai_usage_user_date" ON "public"."ai_usage_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_available_tasks_active" ON "public"."available_tasks" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_available_tasks_user_id" ON "public"."available_tasks" USING "btree" ("user_id");



CREATE INDEX "idx_child_progress_child_id" ON "public"."child_progress" USING "btree" ("child_id");



CREATE INDEX "idx_children_user_id" ON "public"."children_save" USING "btree" ("user_id");



CREATE INDEX "idx_family_members_user_id" ON "public"."family_members" USING "btree" ("user_id");



CREATE INDEX "idx_google_connections_user_id" ON "public"."google_connections" USING "btree" ("user_id");



CREATE INDEX "idx_reward_levels_user_id" ON "public"."reward_levels" USING "btree" ("user_id");



CREATE INDEX "idx_rotation_assignments_sort" ON "public"."rotation_assignments" USING "btree" ("user_id", "week_start", "sort_order");



CREATE INDEX "idx_rotation_assignments_user_week" ON "public"."rotation_assignments" USING "btree" ("user_id", "week_start");



CREATE INDEX "idx_rotation_completions_date" ON "public"."rotation_completions" USING "btree" ("child_id", "task_id", "date"("completed_at"));



CREATE INDEX "idx_screen_time_config_child_id" ON "public"."screen_time_config" USING "btree" ("child_id");



CREATE INDEX "idx_screen_time_sessions_active" ON "public"."screen_time_sessions" USING "btree" ("child_id", "is_active");



CREATE INDEX "idx_screen_time_sessions_child_id" ON "public"."screen_time_sessions" USING "btree" ("child_id");



CREATE INDEX "idx_task_lists_user_id" ON "public"."task_lists" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_unique_task_assignment" ON "public"."rotation_assignments" USING "btree" ("user_id", "week_start", "task_id");



CREATE INDEX "idx_weekly_menu_day" ON "public"."weekly_menu" USING "btree" ("user_id", "day_iso_date");



CREATE INDEX "idx_weekly_menu_user_week" ON "public"."weekly_menu" USING "btree" ("user_id", "week_start");



CREATE INDEX "savings_contributions_project_idx" ON "public"."savings_contributions" USING "btree" ("project_id", "created_at" DESC);



CREATE UNIQUE INDEX "savings_contributions_tx_unique" ON "public"."savings_contributions" USING "btree" ("transaction_id");



CREATE INDEX "savings_project_audit_member_idx" ON "public"."savings_project_audit" USING "btree" ("family_member_id", "created_at" DESC);



CREATE INDEX "savings_project_audit_project_idx" ON "public"."savings_project_audit" USING "btree" ("project_id", "created_at" DESC);



CREATE INDEX "savings_projects_member_idx" ON "public"."savings_projects" USING "btree" ("family_member_id", "status");



CREATE OR REPLACE TRIGGER "savings_projects_audit" AFTER INSERT OR UPDATE ON "public"."savings_projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_savings_projects_audit"();



CREATE OR REPLACE TRIGGER "savings_projects_limit_active" BEFORE INSERT OR UPDATE OF "status", "family_member_id" ON "public"."savings_projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_savings_projects_limit_active"();



CREATE OR REPLACE TRIGGER "savings_projects_target_guard" BEFORE INSERT OR UPDATE OF "target_amount" ON "public"."savings_projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_savings_projects_target_guard"();



CREATE OR REPLACE TRIGGER "trg_rotation_assignments_updated_at" BEFORE UPDATE ON "public"."rotation_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_rotation_assignments_updated_at"();



CREATE OR REPLACE TRIGGER "update_child_progress_updated_at" BEFORE UPDATE ON "public"."child_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_client_config_updated_at" BEFORE UPDATE ON "public"."client_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_google_connections_updated_at" BEFORE UPDATE ON "public"."google_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_weekly_menu_updated_at" BEFORE UPDATE ON "public"."weekly_menu" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_family_settings"
    ADD CONSTRAINT "ai_family_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."allowance_transactions"
    ADD CONSTRAINT "allowance_transactions_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."available_tasks"
    ADD CONSTRAINT "available_tasks_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children_save"("id");



ALTER TABLE ONLY "public"."available_tasks"
    ADD CONSTRAINT "available_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_progress"
    ADD CONSTRAINT "child_progress_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."children_save"
    ADD CONSTRAINT "children_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_config"
    ADD CONSTRAINT "client_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."family_members"
    ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_connections"
    ADD CONSTRAINT "google_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_levels"
    ADD CONSTRAINT "reward_levels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rotation_assignments"
    ADD CONSTRAINT "rotation_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."rotation_tasks"("id");



ALTER TABLE ONLY "public"."rotation_assignments"
    ADD CONSTRAINT "rotation_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rotation_completions"
    ADD CONSTRAINT "rotation_completions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."rotation_assignments"("id");



ALTER TABLE ONLY "public"."rotation_completions"
    ADD CONSTRAINT "rotation_completions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children_save"("id");



ALTER TABLE ONLY "public"."rotation_completions"
    ADD CONSTRAINT "rotation_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."rotation_tasks"("id");



ALTER TABLE ONLY "public"."rotation_completions"
    ADD CONSTRAINT "rotation_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rotation_tasks"
    ADD CONSTRAINT "rotation_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."savings_contributions"
    ADD CONSTRAINT "savings_contributions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."savings_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_contributions"
    ADD CONSTRAINT "savings_contributions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."allowance_transactions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."savings_project_audit"
    ADD CONSTRAINT "savings_project_audit_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_project_audit"
    ADD CONSTRAINT "savings_project_audit_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."savings_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_projects"
    ADD CONSTRAINT "savings_projects_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screen_time_config"
    ADD CONSTRAINT "screen_time_config_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screen_time_sessions"
    ADD CONSTRAINT "screen_time_sessions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_lists"
    ADD CONSTRAINT "task_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_menu"
    ADD CONSTRAINT "weekly_menu_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Enable delete for authenticated users" ON "public"."google_connections" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users" ON "public"."google_connections" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for authenticated users" ON "public"."google_connections" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Rotation insert own rows" ON "public"."rotation_assignments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Rotation select own rows" ON "public"."rotation_assignments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Rotation update own rows" ON "public"."rotation_assignments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Service role can insert AI usage logs" ON "public"."ai_usage_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can delete own available tasks" ON "public"."available_tasks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own settings" ON "public"."ai_family_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own available tasks" ON "public"."available_tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert own settings" ON "public"."ai_family_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own available tasks" ON "public"."available_tasks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own children" ON "public"."children_save" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own children progress" ON "public"."child_progress" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."id" = "child_progress"."child_id") AND ("fm"."user_id" = "auth"."uid"()) AND (COALESCE("fm"."role", 'child'::"text") = 'child'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."id" = "child_progress"."child_id") AND ("fm"."user_id" = "auth"."uid"()) AND (COALESCE("fm"."role", 'child'::"text") = 'child'::"text")))));



CREATE POLICY "Users can manage own config" ON "public"."client_config" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own reward levels" ON "public"."reward_levels" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own screen time config" ON "public"."screen_time_config" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."id" = "screen_time_config"."child_id") AND ("fm"."user_id" = "auth"."uid"()) AND (COALESCE("fm"."role", 'child'::"text") = 'child'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."id" = "screen_time_config"."child_id") AND ("fm"."user_id" = "auth"."uid"()) AND (COALESCE("fm"."role", 'child'::"text") = 'child'::"text")))));



CREATE POLICY "Users can manage own screen time sessions" ON "public"."screen_time_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."id" = "screen_time_sessions"."child_id") AND ("fm"."user_id" = "auth"."uid"()) AND (COALESCE("fm"."role", 'child'::"text") = 'child'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."family_members" "fm"
  WHERE (("fm"."id" = "screen_time_sessions"."child_id") AND ("fm"."user_id" = "auth"."uid"()) AND (COALESCE("fm"."role", 'child'::"text") = 'child'::"text")))));



CREATE POLICY "Users can manage own task lists" ON "public"."task_lists" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own tasks" ON "public"."available_tasks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own available tasks" ON "public"."available_tasks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own settings" ON "public"."ai_family_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own AI usage logs" ON "public"."ai_usage_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own available tasks" ON "public"."available_tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own settings" ON "public"."ai_family_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own menu" ON "public"."weekly_menu" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own weekly menu" ON "public"."weekly_menu" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own children" ON "public"."children_save" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ai_family_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."available_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."child_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."children_save" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rotation_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."screen_time_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."screen_time_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_lists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_menu" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."child_progress";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."cleanup_old_weekly_menus"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_weekly_menus"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_weekly_menus"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_config"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."savings_project_saved_amount"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."savings_project_saved_amount"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."savings_project_saved_amount"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_rotation_assignments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_rotation_assignments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_rotation_assignments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_savings_projects_audit"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_savings_projects_audit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_savings_projects_audit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_savings_projects_limit_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_savings_projects_limit_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_savings_projects_limit_active"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_savings_projects_target_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_savings_projects_target_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_savings_projects_target_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."ai_family_settings" TO "anon";
GRANT ALL ON TABLE "public"."ai_family_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_family_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_by_user" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_by_user" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_by_user" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_stats" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_stats" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_summary" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_summary" TO "service_role";



GRANT ALL ON TABLE "public"."allowance_transactions" TO "anon";
GRANT ALL ON TABLE "public"."allowance_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."allowance_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."available_tasks" TO "anon";
GRANT ALL ON TABLE "public"."available_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."available_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."child_progress" TO "anon";
GRANT ALL ON TABLE "public"."child_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."child_progress" TO "service_role";



GRANT ALL ON TABLE "public"."children_save" TO "anon";
GRANT ALL ON TABLE "public"."children_save" TO "authenticated";
GRANT ALL ON TABLE "public"."children_save" TO "service_role";



GRANT ALL ON TABLE "public"."client_config" TO "anon";
GRANT ALL ON TABLE "public"."client_config" TO "authenticated";
GRANT ALL ON TABLE "public"."client_config" TO "service_role";



GRANT ALL ON TABLE "public"."completed_tasks" TO "anon";
GRANT ALL ON TABLE "public"."completed_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."completed_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."family_members" TO "anon";
GRANT ALL ON TABLE "public"."family_members" TO "authenticated";
GRANT ALL ON TABLE "public"."family_members" TO "service_role";



GRANT ALL ON TABLE "public"."google_connections" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reward_levels" TO "anon";
GRANT ALL ON TABLE "public"."reward_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_levels" TO "service_role";



GRANT ALL ON TABLE "public"."reward_levels_template" TO "anon";
GRANT ALL ON TABLE "public"."reward_levels_template" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_levels_template" TO "service_role";



GRANT ALL ON TABLE "public"."rotation_assignments" TO "anon";
GRANT ALL ON TABLE "public"."rotation_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."rotation_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."rotation_completions" TO "anon";
GRANT ALL ON TABLE "public"."rotation_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."rotation_completions" TO "service_role";



GRANT ALL ON TABLE "public"."rotation_tasks" TO "anon";
GRANT ALL ON TABLE "public"."rotation_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."rotation_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."savings_contributions" TO "anon";
GRANT ALL ON TABLE "public"."savings_contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_contributions" TO "service_role";



GRANT ALL ON TABLE "public"."savings_project_audit" TO "anon";
GRANT ALL ON TABLE "public"."savings_project_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_project_audit" TO "service_role";



GRANT ALL ON TABLE "public"."savings_projects" TO "anon";
GRANT ALL ON TABLE "public"."savings_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_projects" TO "service_role";



GRANT ALL ON TABLE "public"."screen_time_config" TO "anon";
GRANT ALL ON TABLE "public"."screen_time_config" TO "authenticated";
GRANT ALL ON TABLE "public"."screen_time_config" TO "service_role";



GRANT ALL ON TABLE "public"."screen_time_sessions" TO "anon";
GRANT ALL ON TABLE "public"."screen_time_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."screen_time_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."task_lists" TO "anon";
GRANT ALL ON TABLE "public"."task_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."task_lists" TO "service_role";



GRANT ALL ON TABLE "public"."v_google_connections_safe" TO "anon";
GRANT ALL ON TABLE "public"."v_google_connections_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."v_google_connections_safe" TO "service_role";



GRANT ALL ON TABLE "public"."v_savings_project_progress" TO "anon";
GRANT ALL ON TABLE "public"."v_savings_project_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."v_savings_project_progress" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_menu" TO "anon";
GRANT ALL ON TABLE "public"."weekly_menu" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_menu" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




-- ------------------------------------------------------------
-- Triggers (aligned with DEV)
-- ------------------------------------------------------------

-- auth.users AFTER INSERT -> handle_new_user()
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- public.child_progress BEFORE UPDATE -> update_updated_at_column()
DROP TRIGGER IF EXISTS update_child_progress_updated_at ON public.child_progress;
CREATE TRIGGER update_child_progress_updated_at
BEFORE UPDATE ON public.child_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- public.client_config BEFORE UPDATE -> update_updated_at_column()
DROP TRIGGER IF EXISTS update_client_config_updated_at ON public.client_config;
CREATE TRIGGER update_client_config_updated_at
BEFORE UPDATE ON public.client_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- public.google_connections BEFORE UPDATE -> update_updated_at_column()
DROP TRIGGER IF EXISTS update_google_connections_updated_at ON public.google_connections;
CREATE TRIGGER update_google_connections_updated_at
BEFORE UPDATE ON public.google_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- public.rotation_assignments BEFORE UPDATE -> set_rotation_assignments_updated_at()
DROP TRIGGER IF EXISTS trg_rotation_assignments_updated_at ON public.rotation_assignments;
CREATE TRIGGER trg_rotation_assignments_updated_at
BEFORE UPDATE ON public.rotation_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_rotation_assignments_updated_at();

-- public.savings_projects AFTER INSERT/UPDATE -> trg_savings_projects_audit()
DROP TRIGGER IF EXISTS savings_projects_audit ON public.savings_projects;
CREATE TRIGGER savings_projects_audit
AFTER INSERT OR UPDATE ON public.savings_projects
FOR EACH ROW
EXECUTE FUNCTION public.trg_savings_projects_audit();

-- public.savings_projects BEFORE INSERT/UPDATE -> trg_savings_projects_limit_active()
DROP TRIGGER IF EXISTS savings_projects_limit_active ON public.savings_projects;
CREATE TRIGGER savings_projects_limit_active
BEFORE INSERT OR UPDATE ON public.savings_projects
FOR EACH ROW
EXECUTE FUNCTION public.trg_savings_projects_limit_active();

-- public.savings_projects BEFORE INSERT/UPDATE -> trg_savings_projects_target_guard()
DROP TRIGGER IF EXISTS savings_projects_target_guard ON public.savings_projects;
CREATE TRIGGER savings_projects_target_guard
BEFORE INSERT OR UPDATE ON public.savings_projects
FOR EACH ROW
EXECUTE FUNCTION public.trg_savings_projects_target_guard();

-- public.weekly_menu BEFORE UPDATE -> update_updated_at_column()
DROP TRIGGER IF EXISTS update_weekly_menu_updated_at ON public.weekly_menu;
CREATE TRIGGER update_weekly_menu_updated_at
BEFORE UPDATE ON public.weekly_menu
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();



























