export async function callAI(payload) {
  try {
    const response = await fetch('/api/callAI', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API call failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('callAI error:', error);
    return { data: { error: error.message } };
  }
}