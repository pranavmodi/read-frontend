<template>
    <div class="reading-area flex flex-col h-full">
      <div id="epub-viewer" class="flex-grow"></div>
      <div class="controls flex justify-between p-4 bg-gray-100">
        <button @click="prevPage" class="bg-blue-500 text-white px-4 py-2 rounded">Previous</button>
        <button @click="nextPage" class="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, onUnmounted, watch } from 'vue';
  import ePub from 'epubjs';
  
  export default {
    name: 'ReadingAreaNew',
    props: {
      book: {
        type: Object,
        required: true
      }
    },
    setup(props) {
      const rendition = ref(null);
      const epub = ref(null);
  
      const loadBook = async () => {
        if (epub.value) {
          epub.value.destroy();
        }
  
        epub.value = ePub(props.book.epub);
        rendition.value = epub.value.renderTo('epub-viewer', {
          width: '100%',
          height: '100%'
        });
  
        await rendition.value.display();
      };
  
      const prevPage = () => {
        if (rendition.value) {
          rendition.value.prev();
        }
      };
  
      const nextPage = () => {
        if (rendition.value) {
          rendition.value.next();
        }
      };
  
      onMounted(() => {
        loadBook();
      });
  
      onUnmounted(() => {
        if (epub.value) {
          epub.value.destroy();
        }
      });
  
      watch(() => props.book, () => {
        loadBook();
      });
  
      return {
        prevPage,
        nextPage
      };
    }
  }
  </script>
  
  <style scoped>
  .reading-area {
    height: calc(100vh - 4rem); /* Adjust this value based on your header/footer height */
  }
  
  #epub-viewer {
    width: 100%;
    height: 100%;
  }
  </style>