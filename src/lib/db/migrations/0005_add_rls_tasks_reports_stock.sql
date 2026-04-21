ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'admin_select_tasks'
  ) THEN
    CREATE POLICY "admin_select_tasks" ON tasks
      FOR SELECT
      USING (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'staff_select_own_tasks'
  ) THEN
    CREATE POLICY "staff_select_own_tasks" ON tasks
      FOR SELECT
      USING (
        atribuida_a IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'admin_insert_tasks'
  ) THEN
    CREATE POLICY "admin_insert_tasks" ON tasks
      FOR INSERT
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'admin_update_tasks'
  ) THEN
    CREATE POLICY "admin_update_tasks" ON tasks
      FOR UPDATE
      USING (get_my_role() IN ('ca', 'dg', 'coord'))
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'assignee_update_own_tasks'
  ) THEN
    CREATE POLICY "assignee_update_own_tasks" ON tasks
      FOR UPDATE
      USING (
        atribuida_a IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      )
      WITH CHECK (
        atribuida_a IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'admin_select_reports'
  ) THEN
    CREATE POLICY "admin_select_reports" ON reports
      FOR SELECT
      USING (get_my_role() IN ('ca', 'dg'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'admin_insert_reports'
  ) THEN
    CREATE POLICY "admin_insert_reports" ON reports
      FOR INSERT
      WITH CHECK (get_my_role() IN ('ca', 'dg'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'admin_update_reports'
  ) THEN
    CREATE POLICY "admin_update_reports" ON reports
      FOR UPDATE
      USING (get_my_role() IN ('ca', 'dg'))
      WITH CHECK (get_my_role() IN ('ca', 'dg'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_items' AND policyname = 'admin_coord_select_stock_items'
  ) THEN
    CREATE POLICY "admin_coord_select_stock_items" ON stock_items
      FOR SELECT
      USING (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_items' AND policyname = 'admin_coord_insert_stock_items'
  ) THEN
    CREATE POLICY "admin_coord_insert_stock_items" ON stock_items
      FOR INSERT
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_items' AND policyname = 'admin_coord_update_stock_items'
  ) THEN
    CREATE POLICY "admin_coord_update_stock_items" ON stock_items
      FOR UPDATE
      USING (get_my_role() IN ('ca', 'dg', 'coord'))
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_movements' AND policyname = 'admin_coord_select_stock_movements'
  ) THEN
    CREATE POLICY "admin_coord_select_stock_movements" ON stock_movements
      FOR SELECT
      USING (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stock_movements' AND policyname = 'admin_coord_insert_stock_movements'
  ) THEN
    CREATE POLICY "admin_coord_insert_stock_movements" ON stock_movements
      FOR INSERT
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;
