export type SkillOption = { value: string; label: string };

export const SKILL_OPTIONS: SkillOption[] = [
  "Python", "JavaScript", "TypeScript", "Java", "C#", "C++", "Go", "Rust",
  "PHP", "Ruby", "Kotlin", "Swift", "SQL", "HTML", "CSS", "React", "Vue",
  "Angular", "Next.js", "Node.js", "Express.js", "Django", "Flask", "FastAPI",
  "Spring Boot", ".NET", "PostgreSQL", "MySQL", "MongoDB", "Redis", "AWS",
  "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Git", "GitHub",
  "GitLab", "CI/CD", "Linux", "REST APIs", "GraphQL", "Microservices",
  "Data Analysis", "Machine Learning", "Artificial Intelligence", "Communication",
  "Leadership", "Agile", "Project Management", "Problem Solving", "R", "Scala",
  "Dart", "MATLAB", "Bash", "PowerShell", "Jenkins", "CircleCI", "Nginx",
  "Azure DevOps", "Firebase", "Supabase", "DynamoDB", "SQLite", "Oracle",
  "MariaDB", "Elasticsearch", "Kafka", "RabbitMQ", "Pandas", "NumPy",
  "TensorFlow", "PyTorch", "OpenCV", "Selenium", "Jira", "Cypress", "Playwright",
  "Webpack", "Vite", "OpenAPI", "gRPC", "WebSockets", "OAuth", "JWT",
  "Istio", "Helm", "Ansible", "Pulumi", "Prometheus", "Grafana", "Datadog",
  "Snowflake", "BigQuery", "Airflow", "Spark", "Hadoop", "dbt", "Tableau",
  "Power BI", "Figma", "UX Design", "Technical Writing",
].map((value) => ({ value, label: value }));
