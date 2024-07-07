

export const cacheBookSummary = (bookName, summary) => {
  localStorage.setItem(`book_summary_${bookName}`, JSON.stringify(summary));
};


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

export function cacheChapterSummary(bookName, chapterId, summary) {
  const key = `${bookName}_${chapterId}`;
  try {
    localStorage.setItem(key, JSON.stringify(summary));
  } catch (error) {
    console.error(`Error caching chapter summary for ${bookName}, chapter ${chapterId}:`, error);
  }
}

export function getCachedChapterSummary(bookName, chapterId) {
  const key = `${bookName}_${chapterId}`;
  const cachedData = localStorage.getItem(key);  // Changed from setItem to getItem
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (error) {
      console.error(`Error parsing cached chapter summary for ${bookName}, chapter ${chapterId}:`, error);
      return null;
    }
  }
  return null;
}

export function cacheAllChapterSummaries(bookName, summaries) {
  Object.entries(summaries).forEach(([chapterId, summary]) => {
    cacheChapterSummary(bookName, chapterId, summary);
  });
}

export function clearAllCache() {
  localStorage.clear();
  console.log('All cache cleared');
}

export function getCachedAllChapterSummaries(bookName, chapterIds) {
  const summaries = {};
  chapterIds.forEach(chapterId => {
    const summary = getCachedChapterSummary(bookName, chapterId);
    if (summary) {
      summaries[chapterId] = summary;
    }
  });
  return Object.keys(summaries).length > 0 ? summaries : null;
}