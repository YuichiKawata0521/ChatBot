INSERT INTO departments (id, dep1_code, dep1_name, dep2_code, dep2_name, dep3_code, dep3_name)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 'PF', 'ポートフォリオ本部', 'PF-01', 'テスト部門1', 'PF-01-01', 'テスト課1'),
    (2, 'PF', 'ポートフォリオ本部', 'PF-02', 'テスト部門2', 'PF-02-01', 'テスト課2'),
    (3, 'PF', 'ポートフォリオ本部', 'PF-03', 'テスト部門3', 'PF-03-01', 'テスト課3')
ON CONFLICT (id)
DO UPDATE SET
    dep1_code = EXCLUDED.dep1_code,
    dep1_name = EXCLUDED.dep1_name,
    dep2_code = EXCLUDED.dep2_code,
    dep2_name = EXCLUDED.dep2_name,
    dep3_code = EXCLUDED.dep3_code,
    dep3_name = EXCLUDED.dep3_name,
    updated_at = now();

SELECT setval(
    pg_get_serial_sequence('departments', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 0) FROM departments), 3),
    true
);
