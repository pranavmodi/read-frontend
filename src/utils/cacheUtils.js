export function cacheChapterSummaries(bookName, summaries) {
  localStorage.setItem(bookName, JSON.stringify(summaries));
}

export const cacheBookSummary = (bookName, summary) => {
  localStorage.setItem(`book_summary_${bookName}`, JSON.stringify(summary));
};


export function getCachedChapterSummaries(bookName) {
  const cachedData = localStorage.getItem(bookName);
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (error) {
      console.error(`Error parsing cached chapter summaries for ${bookName}:`, error);
      return null;
    }
  }
  return null;
}

export const getCachedBookSummary = (bookName) => {
  const cachedData = localStorage.getItem(`book_summary_${bookName}`);
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (error) {
      console.error(`Error parsing cached book summary for ${bookName}:`, error);
      return null;
    }
  }
  return null;
};