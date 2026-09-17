export type JobKeywordCategory = 'AI & ML' | 'Data' | 'Cloud & Deployment' | 'Programming & Frameworks' | 'Engineering' | 'Collaboration' | 'Qualifications';

type KeywordDefinition = { term: string; category: JobKeywordCategory; aliases?: string[] };

const definitions: KeywordDefinition[] = [
  { term: 'Artificial Intelligence', category: 'AI & ML', aliases: ['artificial intelligence', ' ai '] },
  { term: 'Machine Learning', category: 'AI & ML', aliases: ['machine learning', ' ml '] },
  { term: 'Generative AI', category: 'AI & ML', aliases: ['generative ai', 'genai'] },
  { term: 'Generative Models', category: 'AI & ML', aliases: ['generative model'] },
  { term: 'Large Language Models (LLMs)', category: 'AI & ML', aliases: ['large language model', 'llms', 'llm'] },
  { term: 'Agentic AI', category: 'AI & ML', aliases: ['agentic ai', 'ai agent'] },
  { term: 'Reinforcement Learning', category: 'AI & ML' },
  { term: 'Natural Language Processing (NLP)', category: 'AI & ML', aliases: ['natural language processing', 'nlp'] },
  { term: 'Deep Learning', category: 'AI & ML' },
  { term: 'Computer Vision', category: 'AI & ML' },
  { term: 'Prompt Engineering', category: 'AI & ML' },
  { term: 'Retrieval-Augmented Generation (RAG)', category: 'AI & ML', aliases: ['retrieval augmented generation', 'rag'] },
  { term: 'AI/ML Engineering', category: 'AI & ML', aliases: ['ai/ml engineering', 'ai ml engineering'] },
  { term: 'AI Methodologies', category: 'AI & ML' },
  { term: 'Generative AI Architectures', category: 'AI & ML', aliases: ['generative ai architecture'] },
  { term: 'AI Solutions', category: 'AI & ML', aliases: ['ai solution'] },
  { term: 'Model Engineering', category: 'AI & ML' },
  { term: 'Model Context Protocol (MCP)', category: 'AI & ML', aliases: ['model context protocol', 'mcp'] },
  { term: 'Tool Calling', category: 'AI & ML', aliases: ['tool calling', 'tool/function calling'] },
  { term: 'Function Calling', category: 'AI & ML', aliases: ['function calling', 'tool/function calling'] },
  { term: 'Memory', category: 'AI & ML', aliases: ['agent memory', 'memory'] },
  { term: 'Data Science', category: 'Data' },
  { term: 'Data Scientists', category: 'Data', aliases: ['data scientist'] },
  { term: 'Data Analysis', category: 'Data', aliases: ['data analysis', 'data analyst', 'data analysts', 'analytics'] },
  { term: 'Large Datasets', category: 'Data', aliases: ['large dataset'] },
  { term: 'Data Management', category: 'Data' },
  { term: 'Data Quality', category: 'Data' },
  { term: 'Data Integrity', category: 'Data', aliases: ['data integrity', 'quality and integrity'] },
  { term: 'Data Preprocessing', category: 'Data', aliases: ['data preprocessing', 'preprocess data', 'preprocessing'] },
  { term: 'Feature Engineering', category: 'Data' },
  { term: 'Model Training', category: 'Data' },
  { term: 'Model Evaluation', category: 'Data', aliases: ['model evaluation', 'training evaluation', 'training, evaluation'] },
  { term: 'Model Optimization', category: 'Data', aliases: ['model optimization', 'optimize models', 'optimize generative'] },
  { term: 'AWS', category: 'Cloud & Deployment' },
  { term: 'Azure', category: 'Cloud & Deployment' },
  { term: 'GCP', category: 'Cloud & Deployment', aliases: ['gcp', 'google cloud'] },
  { term: 'Cloud-Based Platforms', category: 'Cloud & Deployment', aliases: ['cloud-based platform', 'cloud based platform'] },
  { term: 'Cloud AI Deployment', category: 'Cloud & Deployment' },
  { term: 'AI Model Deployment', category: 'Cloud & Deployment', aliases: ['model deployment', 'deploy ai models', 'ai models into production'] },
  { term: 'Production Environments', category: 'Cloud & Deployment', aliases: ['production environment', 'production use case'] },
  { term: 'Scalable AI Solutions', category: 'Cloud & Deployment', aliases: ['scalable ai solution'] },
  { term: 'High Availability', category: 'Cloud & Deployment' },
  { term: 'Performance', category: 'Cloud & Deployment', aliases: ['performance'] },
  { term: 'Operational Efficiency', category: 'Cloud & Deployment' },
  { term: 'Python', category: 'Programming & Frameworks' },
  { term: '.NET', category: 'Programming & Frameworks', aliases: ['.net', 'dotnet'] },
  { term: 'Java', category: 'Programming & Frameworks' },
  { term: 'JavaScript', category: 'Programming & Frameworks' },
  { term: 'TypeScript', category: 'Programming & Frameworks' },
  { term: 'SQL', category: 'Programming & Frameworks' },
  { term: 'TensorFlow', category: 'Programming & Frameworks' },
  { term: 'PyTorch', category: 'Programming & Frameworks' },
  { term: 'Keras', category: 'Programming & Frameworks' },
  { term: 'Pandas', category: 'Programming & Frameworks' },
  { term: 'NumPy', category: 'Programming & Frameworks' },
  { term: 'Scikit-learn', category: 'Programming & Frameworks', aliases: ['scikit-learn', 'sklearn'] },
  { term: 'Docker', category: 'Engineering' },
  { term: 'Kubernetes', category: 'Engineering' },
  { term: 'APIs', category: 'Engineering', aliases: ['apis', 'api integration'] },
  { term: 'Workflows', category: 'Engineering', aliases: ['workflow', 'workflows'] },
  { term: 'Orchestration', category: 'Engineering' },
  { term: 'AI Integration', category: 'Engineering', aliases: ['ai integration', 'integrate ai models'] },
  { term: 'Enterprise AI', category: 'Engineering', aliases: ['enterprise ai', 'enterprise-grade ai', 'enterprise grade ai'] },
  { term: 'AI Platforms', category: 'Engineering', aliases: ['ai platform'] },
  { term: 'Human-Centred Design', category: 'Engineering', aliases: ['human-centred design', 'human-centered design'] },
  { term: 'Communication', category: 'Collaboration', aliases: ['communication skills'] },
  { term: 'Interpersonal Skills', category: 'Collaboration' },
  { term: 'Verbal Communication', category: 'Collaboration', aliases: ['verbal communication', 'verbal and written communication'] },
  { term: 'Written Communication', category: 'Collaboration' },
  { term: 'Collaboration', category: 'Collaboration', aliases: ['collaborate', 'collaborative'] },
  { term: 'Cross-Functional Teams', category: 'Collaboration', aliases: ['cross-functional team', 'cross functional team'] },
  { term: 'Full-Time Graduation', category: 'Qualifications', aliases: ['full-time graduation', 'full time graduation'] },
  { term: '15 Years of Full-Time Education', category: 'Qualifications', aliases: ['15 years of full-time education', '15 years of full time education'] },
];

function normalize(value: string) {
  return ` ${value.toLowerCase().replace(/[’']/g, "'").replace(/&/g, ' and ').replace(/[^a-z0-9+#.\/-]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function aliasPattern(alias: string) {
  const normalized = normalize(alias).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^a-z0-9])${normalized}(?=$|[^a-z0-9])`, 'i');
}

function isPresent(text: string, definition: KeywordDefinition) {
  return [definition.term, ...(definition.aliases || [])].some(alias => aliasPattern(alias).test(text));
}

export function extractJobKeywords(value: string, limit = 100) {
  const text = normalize(value.replace(/https?:\/\/\S+/gi, ' '));
  if (!text.trim()) return [];
  return definitions.filter(definition => isPresent(text, definition)).slice(0, limit).map(definition => definition.term);
}

export function keywordCategory(term: string) {
  return definitions.find(definition => definition.term === term)?.category || 'Engineering';
}

export function resumeContainsKeyword(resumeText: string, term: string) {
  const definition = definitions.find(item => item.term === term);
  return definition ? isPresent(normalize(resumeText), definition) : aliasPattern(term).test(normalize(resumeText));
}
