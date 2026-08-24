// API Utilities for Syllabus Analyzer

export async function analyzeSyllabus({
  syllabusText,
  classNotes,
  videoLinks,
  syllabusFile,
  moduleList,
  learningOutcomes,
  apiKey,
  modelName
}) {
  const formData = new FormData();
  formData.append('syllabusText', syllabusText || '');
  formData.append('classNotes', classNotes || '');
  formData.append('videoLinks', videoLinks || '');
  formData.append('moduleList', moduleList || '');
  formData.append('learningOutcomes', learningOutcomes || '');
  formData.append('modelName', modelName);

  if (syllabusFile) {
    formData.append('syllabusFile', syllabusFile);
  }

  const headers = {};
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with code ${response.status}`);
  }

  return response.json();
}
