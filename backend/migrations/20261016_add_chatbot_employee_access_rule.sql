-- Tenant-configurable employee chatbot access. Existing tenants inherit the
-- catalog default (disabled) until an administrator enables it.
INSERT INTO business_rules (
    business_rule_key,
    name,
    description,
    default_value,
    data_type
)
VALUES (
    'chatbot.employee_access_enabled',
    'Employee chatbot access',
    'Controls whether employees in the tenant can see and use the chatbot.',
    'false',
    'BOOLEAN'
)
ON CONFLICT (business_rule_key) DO NOTHING;
