<template>
  <div class="reading-area relative" :style="{ paddingTop: `${headerHeight}px`, paddingBottom: `${footerHeight}px` }">
    <!-- Loading indicator -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    
    <!-- Error message -->
    <div v-else-if="error" class="absolute inset-0 flex items-center justify-center text-red-500 px-4 text-center text-sm">
      {{ error }}
    </div>
    
    <!-- EPUB viewer -->
    <div ref="epubViewerRef" id="epub-viewer" :style="{ height: epubViewerHeight }"></div>

  <!-- Summary Overlay -->
  <div v-if="showSummaryOverlay" class="absolute inset-0 bg-white z-10 flex flex-col overflow-hidden">
    <!-- Fixed Header -->
    <header class="bg-gray-100 shadow-md p-4 flex items-center justify-between">
      <!-- Segmented Control -->
      <div class="inline-flex rounded-md shadow-sm" role="group">
        <button 
          @click="summaryType = 'book'" 
          :class="[
            'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border transition-colors duration-200',
            summaryType === 'book' 
              ? 'bg-blue-500 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          ]"
        >
          Book Summary
        </button>
        <button 
          @click="summaryType = 'chapters'" 
          :class="[
            'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border transition-colors duration-200',
            summaryType === 'chapters' 
              ? 'bg-blue-500 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          ]"
        >
          Chapters
        </button>
      </div>
      
      <!-- Close Button -->
      <button @click="toggleSummaryOverlay" :disabled="isProcessing" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm sm:text-base disabled:opacity-50 transition-colors duration-200">
        Close Summary
      </button>
    </header>

    <!-- Content Area -->
    <div class="flex-grow overflow-y-auto p-4">
      <div v-if="isProcessing" class="flex flex-col items-center justify-center h-full">
        <div class="w-64 bg-gray-200 rounded-full h-6 dark:bg-gray-700 mb-4">
          <div class="bg-blue-600 h-6 rounded-full" :style="{ width: `${progress}%` }"></div>
        </div>
        <p class="text-sm sm:text-base">Processing: {{ progress }}%</p>
      </div>
      <div v-else>
        <div v-if="summaryType === 'book'" class="text-sm sm:text-base">
          <h2 class="text-xl sm:text-2xl font-bold mb-4 text-center">Book Summary</h2>
          <p>{{ bookSummary }}</p>
        </div>
        <div v-else-if="summaryType === 'chapters' && !selectedChapter">
          <h2 class="text-xl sm:text-2xl font-bold mb-4 text-center">Chapter Summaries</h2>
          <ul class="space-y-4">
            <li v-for="chapter in chapterSummaries" :key="chapter.id" 
                @click="handleChapterClick(chapter)"
                class="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <h3 class="font-bold mb-2 text-lg">{{ chapter.title }}</h3>
              <p class="mb-2">{{ chapter.summary }}</p>
            </li>
          </ul>
        </div>
        <div v-else-if="selectedChapter">
          <button @click="handleBackClick" class="mb-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Chapters
          </button>
          <h2 class="text-xl sm:text-2xl font-bold mb-4">{{ selectedChapter.title }}</h2>
          <div v-if="selectedChapter.isLoading">
            <p>Loading detailed summary...</p>
          </div>
          <div v-else>
            <p>{{ selectedChapter.detailedSummary }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>


    <!-- Explanation Overlay -->
    <div v-if="showExplanationOverlay" class="absolute inset-0 bg-white z-10 flex flex-col overflow-hidden">
      <header class="bg-gray-100 shadow-md p-4 flex items-center justify-between">
        <h2 class="text-xl font-bold">Page Explanation</h2>
        <button @click="closeExplanationOverlay" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm sm:text-base transition-colors duration-200">
          Close
        </button>
      </header>
      <div class="flex-grow overflow-y-auto p-4">
        <p class="text-sm sm:text-base">{{ explanationContent }}</p>
      </div>
    </div>

    <!-- Toggle button for summary overlay -->
    <button @click="toggleSummaryOverlay" class="fixed bottom-20 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg z-20">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    </button>

    <!-- Fixed Footer -->
    <footer class="fixed bottom-0 left-0 right-0 bg-gray-100 shadow-md z-10">
      <div class="max-w-4xl mx-auto px-2 py-2 flex justify-between items-center">
        <button @click="prevPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded-full text-xs transition duration-300 ease-in-out transform hover:scale-105">
          &#8592;
        </button>
        <div class="flex space-x-1">
          <button @click="decreaseFontSize" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded text-xs">
            A-
          </button>
          <button @click="increaseFontSize" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded text-xs">
            A+
          </button>
        </div>
        <button @click="nextPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded-full text-xs transition duration-300 ease-in-out transform hover:scale-105">
          &#8594;
        </button>
      </div>
    </footer>
  </div>
</template>


<script>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { API_ENDPOINT } from '@/config';
import io from 'socket.io-client';
// import { clearAllCache, getCachedAllChapterSummaries, getCachedBookSummary, cacheBookSummary, cacheChapterSummary, getCachedChapterSummary } from '@/utils/cacheUtils.js';
import { getCachedBookSummary, cacheBookSummary, getCachedChapterSummary } from '@/utils/cacheUtils.js';
// import { getCachedBookSummary, cacheBookSummary, cacheChapterSummary, getCachedChapterSummary } from '@/utils/cacheUtils.js';

// import ChapterSummaries from './components/ChapterSummaries.vue';


export default {
  name: 'ReadingAreaNew',
  props: {
    book: {
      type: Object,
      required: true
    },
    headerHeight: {
      type: Number,
      required: true
    },
    contentHeight: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const book = ref(null);
    const rendition = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const epubViewerRef = ref(null);
    const fontSize = ref(16); // Default font size in pixels
    const showSummaryOverlay = ref(false);
    const summaryTab = ref('book'); // 'book' or 'chapter'
    const bookSummary = ref('');
    const chapterSummaries = ref({});
    const currentChapter = ref(1);
    const difficultyLevel = ref(5); // Scale of 1-10
    const adaptiveModeEnabled = ref(false);
    const summarizedContent = ref([]);
    const currentSummaryPage = ref(0);
    const currentSummaryContent = ref('');
    const isProcessing = ref(false);
    const progress = ref(0);
    const socket = ref(null);
    const summaryType = ref('book');
    const currentChapterURI = ref('');
    const bookTitle = ref(props.book.name || 'Unknown Book');
    const touchStartX = ref(0);
    const touchEndX = ref(0);
    const touchStartTime = ref(0);
    const footerHeight = ref(50); // Adjust this value based on your footer's actual height
    const windowHeight = ref(window.innerHeight);
    const showExplanationOverlay = ref(false);
    const explanationContent = ref('');
    const summaryView = ref('chapters');
    const selectedChapter = ref(null);
    const detailedSummary = ref('');

    const fetchDetailedChapterSummary = async (chapterId) => {
      try {
        console.log(`Fetching detailed summary for chapter ${chapterId} from server`);
        return chapterId;
        // const response = await fetch(`${API_ENDPOINT}/detailed-chapter-summary/${encodeURIComponent(chapterId)}`, {
        //   method: 'GET',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        // });

        // if (!response.ok) {
        //   throw new Error(`HTTP error! status: ${response.status}`);
        // }

        // const data = await response.json();

        // if (data.status === 'success' && data.chapter_summary) {
        //   return data.chapter_summary.detailed_summary;
        // } else {
        //   throw new Error('Invalid response format or missing chapter summary');
        // }
      } catch (error) {
        console.error(`Error fetching detailed summary for chapter ${chapterId}:`, error);
        return "We're sorry, but we couldn't load the detailed chapter summary at this time. Please try again later.";
      }
    };


    // Update the handleChapterClick function to use fetchDetailedChapterSummary
    const handleChapterClick = async (chapter) => {
      selectedChapter.value = chapter;
      if (!chapter.detailedSummary) {
        chapter.isLoading = true;
        const chapterId = generateChapterIdentifier(chapter.href);
        chapter.detailedSummary = await fetchDetailedChapterSummary(chapterId);
        chapter.isLoading = false;
      }
    };

    const handleBackClick = () => {
      // summaryView.value = 'chapters';
      selectedChapter.value = null;
    };


    const closeExplanationOverlay = () => {
      showExplanationOverlay.value = false;
    };


    const getHighlightedText = () => {
      const selection = rendition.value.manager.getContents()[0].window.getSelection();
      return selection.toString().trim();
    };

    const explainPage = async () => {
      if (!rendition.value) {
        console.error("Rendition not available");
        return;
      }

      try {
        const currentLocation = rendition.value.currentLocation();
        if (!currentLocation) {
          console.error("Current location not available");
          return;
        }

        console.log("Current location:", currentLocation);

        // Function to generate a CFI range from two CFI locations
        const makeRangeCfi = (a, b) => {
          const CFI = new window.ePub.CFI()
          const start = CFI.parse(a), end = CFI.parse(b)
          const cfi = {
            range: true,
            base: start.base,
            path: {
              steps: [],
              terminal: null
            },
            start: start.path,
            end: end.path
          }
          const len = cfi.start.steps.length
          for (let i = 0; i < len; i++) {
            if (CFI.equalStep(cfi.start.steps[i], cfi.end.steps[i])) {
              if (i == len - 1) {
                // Last step is equal, check terminals
                if (cfi.start.terminal === cfi.end.terminal) {
                  // CFI's are equal
                  cfi.path.steps.push(cfi.start.steps[i])
                  // Not a range
                  cfi.range = false
                }
              } else cfi.path.steps.push(cfi.start.steps[i])
            } else break
          }
          cfi.start.steps = cfi.start.steps.slice(cfi.path.steps.length)
          cfi.end.steps = cfi.end.steps.slice(cfi.path.steps.length)

          return 'epubcfi(' + CFI.segmentString(cfi.base)
            + '!' + CFI.segmentString(cfi.path)
            + ',' + CFI.segmentString(cfi.start)
            + ',' + CFI.segmentString(cfi.end)
            + ')'
        }

        // Get the start and end CFIs for the current location
        const [startCfi, endCfi] = [currentLocation.start.cfi, currentLocation.end.cfi];
        
        // console.log("Start CFI:", startCfi);
        // console.log("End CFI:", endCfi);

        // Generate the range CFI
        const rangeCfi = makeRangeCfi(startCfi, endCfi);
        // console.log("Range CFI:", rangeCfi);

        // Get the range object and extract the text
        const range = await book.value.getRange(rangeCfi);
        let visibleText = range.toString();

        // console.log("Visible text length:", visibleText.length);
        // console.log("First 100 characters of visible text:", visibleText);

        // Get highlighted text
        const highlightedText = getHighlightedText();
        console.log("Highlighted text:", highlightedText);

        if (!visibleText) {
          console.error("No visible text found on the current page");
          return;
        }

        // Get current chapter information
        const currentChapter = book.value.spine.get(currentLocation.start.cfi);
        const chapterName = currentChapter ? currentChapter.href : 'Unknown Chapter';

        console.log("Current chapter:", chapterName);

        const response = await fetch(`${API_ENDPOINT}/explain-page`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            book_name: props.book.name,
            chapter_name: chapterName,
            page_text: visibleText,
            highlighted_text: highlightedText
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get page explanation');
        }

        const data = await response.json();
        explanationContent.value = data.explanation.explanation;
        showExplanationOverlay.value = true;

      } catch (error) {
        console.error('Error explaining page:', error);
        explanationContent.value = "Failed to explain the page. Please try again.";
        showExplanationOverlay.value = true;
      }
    };

    const epubViewerHeight = computed(() => {
      return `${windowHeight.value - props.headerHeight - footerHeight.value}px`;
    });

    const updateWindowHeight = () => {
      windowHeight.value = window.innerHeight;
    };


    // const epubViewerHeight = computed(() => {
    //   return `calc(100vh - ${props.headerHeight}px - 50px)`; // 50px for footer, adjust if needed
    // });

    const mobileEpubViewerHeight = computed(() => {
      return `calc(100vh - ${props.headerHeight}px - 90px)`; // 90px for mobile footer, adjust if needed
    });

    const handleTouchStart = (event) => {
      try {
        touchStartX.value = event.changedTouches[0].clientX;
        touchStartTime.value = Date.now();
      } catch (error) {
        console.error('Error in handleTouchStart:', error);
      }
    };

    const handleTouchEnd = (event) => {
      try {
        touchEndX.value = event.changedTouches[0].clientX;
        handleTapOrSwipe();
      } catch (error) {
        console.error('Error in handleTouchEnd:', error);
      }
    };

    const resetTouchValues = () => {
      touchStartX.value = 0;
      touchEndX.value = 0;
      touchStartTime.value = 0;
    };


    const handleTapOrSwipe = () => {
      const tapThreshold = 10; // maximum distance moved to be considered a tap
      const swipeThreshold = 50; // minimum distance moved to be considered a swipe
      const timeThreshold = 300; // maximum time in ms for a swipe

      const touchDistance = Math.abs(touchEndX.value - touchStartX.value);
      const touchTime = Date.now() - touchStartTime.value;

      if (touchDistance < tapThreshold && touchTime < timeThreshold) {
        handleTap(touchEndX.value);
      } else if (touchDistance > swipeThreshold && touchTime < timeThreshold) {
        handleSwipe();
      }

      resetTouchValues();
    };

    
    const handleSwipe = () => {
      const swipeDistance = touchEndX.value - touchStartX.value;
      
      if (swipeDistance > 0) {
        prevPage();
      } else if (swipeDistance < 0) {
        nextPage();
      }
    };

    const handleTap = (x) => {
      const viewerElement = document.getElementById('epub-viewer');
      if (!viewerElement) return;

      const viewerWidth = viewerElement.offsetWidth;
      const tapPosition = x - viewerElement.getBoundingClientRect().left;

      viewerElement.classList.add('tapped');
      setTimeout(() => viewerElement.classList.remove('tapped'), 200);

      if (tapPosition < viewerWidth / 2) {
        prevPage();
      } else {
        nextPage();
      }
    };

    const setupSocketListeners = () => {
      if (!socket.value) return;

      socket.value.on('connect', () => {
        console.log('Socket connected');
      });

      socket.value.on('progress_update', (data) => {
        progress.value = data.progress;
      });

      socket.value.on('processing_complete', (data) => {
        console.log('Processing complete event received:', data);
        console.log('the props book name', props.book.name);
        if (data.book_name === props.book.name) {
          console.log('Processing complete for current book');
          getBookSummary();
          getAllSummaries();
          isProcessing.value = false;
          console.log("turned in processing false");

        }
      });

      // socket.value.on('summaries_complete', (data) => {
      //   console.log('Summaries complete event received:', data);
      //   console.log('the props book name', props.book.name);
      //   if (data.book_name === props.book.name) {
      //     console.log('Summaries complete for current book');
      //     isProcessing.value = false;
      //     // getBookSummary();
      //     // getAllSummaries();
      //   }
      // });

      socket.value.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socket.value.on('connect_error', (error) => {
        console.error('Connection Error:', error);
      });
    };


    const connectSocket = () => {
      if (socket.value && socket.value.connected) {
        console.log('Socket already connected');
        return;
      }

      socket.value = io(API_ENDPOINT, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      setupSocketListeners();
    };


    const disconnectSocket = () => {
      if (socket.value) {
        socket.value.disconnect();
        socket.value = null;
      }
    };


    const processEpub = async () => {
      try {
        isProcessing.value = true;
        progress.value = 0;
        
        const response = await fetch(`${API_ENDPOINT}/process-epub`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: props.book.filename,
            name: props.book.name,
            book_id: props.book.book_id
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to process ePub');
        }
        
        // The socket will handle progress updates and trigger getBookSummary and getChapterSummaries when done
      } catch (error) {
        console.error('Error processing ePub:', error);
        // isProcessing.value = false;
      }
    };

    const generatePlaceholderSummaries = () => {
      bookSummary.value = "This is a placeholder for the entire book summary. It provides an overview of the main themes, characters, and plot points discussed throughout the book.";
      
      chapterSummaries.value = Array(10).fill().map((_, index) => 
        `This is a placeholder summary for Chapter ${index + 1}. It briefly describes the key events, character developments, and important points covered in this chapter.`
      );
    };
 

    const toggleAdaptiveMode = () => {
      adaptiveModeEnabled.value = !adaptiveModeEnabled.value;
        if (adaptiveModeEnabled.value) {
          applyAdaptiveDifficulty();
        } else {
          resetTextDifficulty();
        }
    };

    const applyAdaptiveDifficulty = async () => {
      if (rendition.value && adaptiveModeEnabled.value) {
        const contents = await rendition.value.getContents();
        contents.forEach(content => {
          if (content.content) {
            const simplifiedText = simulateTextSimplification(content.content.innerHTML);
            content.content.innerHTML = simplifiedText;
          }
        });
      }
    };

    // const generateChapterIdentifier = (chapterHref) => {
    //   try {
    //     const bookName = props.book.name || 'UnknownBook';
    //     // const chapterUri = chapterHref.split('/').pop(); // Get the filename from the href
    //     const chapterIdentifier = `${bookName}_Chapter_${chapterHref}`;
        
    //     // Encode the entire chapter identifier
    //     // console.log(' Chapter Identifier:', chapterIdentifier);
    //     const encodedChapterIdentifier = encodeURIComponent(chapterIdentifier);
    //     return encodedChapterIdentifier;
    //   } catch (error) {
    //     console.error('Error generating chapter identifier:', error);
    //     return '';
    //   }
    // };

    const generateChapterIdentifier = (chapterHref) => {
      try {
        const bookName = props.book.name || 'UnknownBook';
        // const chapterUri = chapterHref.split('/').pop(); // Get the filename from the href
        const chapterIdentifier = `${bookName}_Chapter_${chapterHref}`;
        
        return chapterIdentifier;
      } catch (error) {
        console.error('Error generating chapter identifier:', error);
        return '';
      }
    };

    const getAllSummaries = async () => {
      if (!book.value || !book.value.spine) {
        console.error("Book not loaded or spine not available");
        return;
      }

      const chapters = book.value.spine.spineItems;
      
      chapterSummaries.value = chapters.map((chapter, index) => ({
        id: index + 1,
        title: `Chapter ${index + 1}`,
        summary: "Fetching summary...",
        href: chapter.href,
        isLoading: false,
        isExpanded: false,
        detailedSummary: null
      }));

      for (let chapter of chapterSummaries.value) {
        try {
          const chapterId = generateChapterIdentifier(chapter.href);
          const response = await fetch(`${API_ENDPOINT}/chapter-summary/${encodeURIComponent(chapterId)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          const data = await response.json();
          if (data.status === 'success' && data.chapter_summary) {
            chapter.summary = data.chapter_summary.summary;
          } else {
            throw new Error('Invalid response format or missing chapter summary');
          }
        } catch (error) {
          console.error(`Error fetching summary for chapter ${chapter.id}:`, error);
          chapter.summary = "Failed to load chapter summary.";
        }
      }
    };

    // const getChapterSummaries = async () => {
    //   if (!book.value) {
    //     console.error("Book not loaded");
    //     return;
    //   }

    //   const chapters = book.value.spine.spineItems;
    //   const summaryPromises = chapters.map(async (chapter, index) => {
    //   const chapterId = generateChapterIdentifier(chapter.href);

    //   try {
    //     const response = await fetch(`${API_ENDPOINT}/chapter-summary/${chapterId}`);
    //     if (!response.ok) {
    //       throw new Error('Network response was not ok');
    //     }
    //     const data = await response.json();
        
    //     if (data.status === 'success') {
    //       return {
    //         title: `Chapter ${index + 1}`,
    //         content: data.chapter_summary.summary
    //       };
    //     } else {
    //       return {
    //         title: `Chapter ${index + 1}`,
    //         content: "Summary is pending for this chapter."
    //       };
    //     }
    //   } catch (error) {
    //     console.error("Error fetching summary for chapter:", chapter.href, error);
    //     return {
    //       title: `Chapter ${index + 1}`,
    //       content: "An error occurred while fetching the chapter summary."
    //     };
    //   }
    // });
// 
  //   try {
  //     const summaries = await Promise.all(summaryPromises);
  //     chapterSummaries.value = summaries;
  //   } catch (error) {
  //     console.error("Error fetching chapter summaries:", error);
  //   }
  // };

    const simulateTextSimplification = (text) => {
      // This is a placeholder function. In a real implementation, you'd use an AI service to simplify the text.
      // return text.replace(/\b\w{10,}\b/g, 'simplified_word');
      const t = text[0];
      return t;
    };

    const resetTextDifficulty = async () => {
      if (rendition.value) {
        const currentLocation = rendition.value.currentLocation();
        if (currentLocation) {
          const cfi = currentLocation.start.cfi;
          await rendition.value.display(cfi);
        } else {
          // If no current location, just redisplay from the beginning
          await rendition.value.display();
        }
      }
    };

    const toggleSummaryOverlay = async () => {
      if (!showSummaryOverlay.value) {
        showSummaryOverlay.value = true;
        // isProcessing.value = true;
        connectSocket(); // This is now called in loadBook
        // // await processEpub(); // This is now called in loadBook
        // getBookSummary();
        // getAllSummaries();
        // showSummaryOverlay.value = true;

      } else {
        disconnectSocket();
        showSummaryOverlay.value = false;
      }
    };

    const increaseFontSize = () => {
      fontSize.value = Math.min(fontSize.value + 2, 32);
      updateFontSize();
    };

    const decreaseFontSize = () => {
      fontSize.value = Math.max(fontSize.value - 2, 12);
      updateFontSize();
    };

    const updateFontSize = () => {
      if (rendition.value) {
        rendition.value.themes.fontSize(`${fontSize.value}px`);
      }
    };
    

    // const adjustViewerHeight = () => {
    //   if (epubViewerRef.value) {
    //     const viewportHeight = window.innerHeight;
    //     const footerHeight = 64; // Approximate height of the footer
    //     epubViewerRef.value.style.height = `${viewportHeight - footerHeight}px`;
    //   }
    // };

    const loadBook = async () => {
      console.log('in loadbook', isProcessing.value);
      if (book.value) {
        book.value.destroy();
      }

      loading.value = true;
      error.value = null;

      try {
        book.value = new window.ePub(props.book.epub);
        rendition.value = book.value.renderTo('epub-viewer', {
          width: '100%',
          height: '75%',
          spread: 'always',
          allowScriptedContent: true
        });

        await rendition.value.display();

        rendition.value.on('touchstart', handleTouchStart);
        rendition.value.on('touchend', handleTouchEnd);

        rendition.value.on('keyup', handleKeyPress);
        rendition.value.themes.fontSize(`${fontSize.value}px`);

        document.addEventListener('keyup', handleKeyPress);

        if (adaptiveModeEnabled.value) {
          await applyAdaptiveDifficulty();
        }

        const bookName = props.book.name || "Unknown Book";

        loading.value = false;
        console.log('Book loaded successfully, now going to initialize book');

        try {

          const response = await fetch(`${API_ENDPOINT}/initialize_book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: props.book.filename,
            book_name: props.book.name,
            book_id: props.book.book_id
          }),
        });
          console.log('Vectorization initialization response:', response.data);
        } catch (vectorizationError) {
          console.error('Error initializing book vectorization:', vectorizationError);
          // Optionally set an error message or handle the error as needed
          // error.value = 'Failed to initialize book vectorization. Some features may be limited.';
        }

        // Check if summaries exist in cache
        // const bookName = props.book.name || "Unknown Book";
        const cachedBookSummary = getCachedBookSummary(bookName);
        
        if (cachedBookSummary) {
          console.log('Retrieved book summary from cache');
          bookSummary.value = cachedBookSummary;
        }

        // Initialize chapter summaries
        const chapters = book.value.spine.spineItems;
        chapterSummaries.value = chapters.map((_, index) => ({
          title: `Chapter ${index + 1}`,
          content: "Fetching summary...",
          isFetching: true
        }));

        // Check for cached chapter summaries
        let allCached = true;
        for (let i = 0; i < chapters.length; i++) {
          const chapterId = generateChapterIdentifier(chapters[i].href);
          const cachedSummary = getCachedChapterSummary(bookName, chapterId);
          if (cachedSummary) {
            chapterSummaries.value[i] = {
              title: `Chapter ${i + 1}`,
              content: cachedSummary,
              isFetching: false
            };
          } else {
            allCached = false;
            break;
          }
        }

        if (!cachedBookSummary || !allCached) {
          console.log('Some or all summaries not found in cache, processing epub');
          connectSocket();
          await processEpub();
          // After processing, fetch the summaries
          await getBookSummary();
          await getAllSummaries();
        } else {
          console.log('All summaries retrieved from cache');
        }

        return true;

      } catch (err) {
        console.error('Error loading book:', err);
        error.value = 'Failed to load the book. Please try again.';
        loading.value = false;
      }
    };

    const initializeEpubViewer = async () => {
      const success = await loadBook();
      if (success) {
        // console.log('Before addTouchListeners:', checkEpubViewer());
        addTouchListeners();
      }
    };

    // const checkEpubViewer = () => {
    //   const epubViewerElement = document.getElementById('epub-viewer');
    //   console.log('Checking epub viewer:', epubViewerElement ? 'Found' : 'Not found');
    //   return epubViewerElement;
    // };

    const prevPage = () => {
      if (rendition.value) {
        const viewer = document.getElementById('epub-viewer');
        viewer.style.opacity = '0.5';
        rendition.value.prev();
        setTimeout(() => {
          viewer.style.opacity = '1';
        }, 300);
      }
    };

    const nextPage = () => {
      if (rendition.value) {
        const viewer = document.getElementById('epub-viewer');
        viewer.style.opacity = '0.5';
        rendition.value.next();
        setTimeout(() => {
          viewer.style.opacity = '1';
        }, 300);
      }
    };

    const handleKeyPress = (event) => {
      switch(event.key) {
        case 'ArrowLeft':
          prevPage();
          break;
        case 'ArrowRight':
          nextPage();
          break;
      }
    };


      const getBookSummary = async () => {
        if (!book.value) {
          console.error("Book not loaded");
          return;
        }
        const cachedBookSummary = getCachedBookSummary(props.book.name);
        if (cachedBookSummary) {
          bookSummary.value = cachedBookSummary;
          console.log('Retrieved book summary from cache');
          return; // Exit the function early if we have a cached summary
        }

        console.log('No cached book summary found');
        // Proceed to fetch book summary from the server

        try {
          const encodedBookTitle = encodeURIComponent(props.book.name);

          // Fetch the book summary
          const response = await fetch(`${API_ENDPOINT}/book-summary/${encodedBookTitle}`);
          
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          
          const data = await response.json();
          if (data.status === 'success' && data.book_summary) {
            bookSummary.value = data.book_summary;
            cacheBookSummary(props.book.name, data.book_summary);
            console.log('Book summary fetched and cached');
          } else {
            throw new Error('Invalid response format or missing book summary');
          }
        } catch (error) {
          console.error("Error fetching book summary:", error);
          bookSummary.value = "Failed to load book summary.";
        }
      };

    const nextSummaryPage = () => {
      if (currentSummaryPage.value < summarizedContent.value.length - 1) {
        currentSummaryPage.value++;
        currentSummaryContent.value = summarizedContent.value[currentSummaryPage.value];
      }
    };

    const prevSummaryPage = () => {
      if (currentSummaryPage.value > 0) {
        currentSummaryPage.value--;
        currentSummaryContent.value = summarizedContent.value[currentSummaryPage.value];
      }
    };

    const addTouchListeners = () => {
      console.log('Adding touch event listeners to window');
      window.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchend', handleTouchEnd, { passive: true });
      window.addEventListener('touchmove', (e) => {
        console.log('Touch move event', e);
      }, { passive: true });
    };

    onMounted(() => {
      // clearAllCache();
      // console.log('cleared all local cache');
      initializeEpubViewer();
      // window.addEventListener('resize', adjustViewerHeight);
      window.addEventListener('resize', updateWindowHeight);

    });

    onUnmounted(() => {
      if (rendition.value) {
        rendition.value.off('touchstart', handleTouchStart);
        rendition.value.off('touchend', handleTouchEnd);
      }
      if (book.value) {
        book.value.destroy();
      }
      document.removeEventListener('keyup', handleKeyPress);
      // window.removeEventListener('resize', adjustViewerHeight);
      window.removeEventListener('resize', updateWindowHeight);

    });

    watch(() => props.book, loadBook);
    watch(() => props.book, initializeEpubViewer);


        // Watch for changes in the current chapter
    watch(() => props.book.currentChapter, (newChapter) => {
      if (newChapter) {
        currentChapterURI.value = newChapter.href;
      }
    });

    watch(isProcessing, (newValue) => {
      if (!newValue) {
        // Processing is complete, update the UI
        // getBookSummary();
        // // getChapterSummaries();
        // getAllSummaries();
      }
    });

    watch(() => props.book.title, (newTitle) => {
      if (newTitle) {
        bookTitle.value = newTitle;
      }
    });

    return {
      prevPage,
      nextPage,
      loading,
      error,
      fontSize,
      increaseFontSize,
      decreaseFontSize,
      difficultyLevel,
      showSummaryOverlay,
      summaryTab,
      bookSummary,
      chapterSummaries,
      currentChapter,
      adaptiveModeEnabled,
      toggleAdaptiveMode,
      toggleSummaryOverlay,
      getBookSummary,
      processEpub,
      nextSummaryPage,
      prevSummaryPage,
      currentSummaryContent,
      isProcessing,
      progress,
      summaryType,
      generatePlaceholderSummaries,
      epubViewerRef,
      // epubViewerHeight,
      mobileEpubViewerHeight,
      footerHeight,
      epubViewerHeight,
      showExplanationOverlay,
      explanationContent,
      explainPage,
      closeExplanationOverlay,
      summaryView,
      selectedChapter,
      detailedSummary,
      handleChapterClick,
      handleBackClick
      // headerHeight: props.headerHeight
    };
  }
}
</script>

<style scoped>
/* .reading-area {
  height: 100%;
  display: flex;
  flex-direction: column;
} */

/* #epub-viewer {
  flex-grow: 1;
  overflow: hidden;
  transition: opacity 0.3s ease;
} */

/* footer {
  flex-shrink: 0;
} */

@media (max-width: 640px) {
  #epub-viewer {
    transition: opacity 0.3s ease;
  }
}

.reading-area {
  height: 80vh;
  overflow: hidden;
}

#epub-viewer {
  width: 100%;
  overflow: hidden;
}

footer {
  height: 50px; /* Make sure this matches the footerHeight ref value */
}

#epub-viewer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

#epub-viewer.tapped::before {
  opacity: 1;
}
</style>


