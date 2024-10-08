<template>
    <div v-if="isVisible" 
        class="fixed bg-white rounded-lg shadow-xl p-4 z-50 chat-window"
        :style="{ top: position.y + 'px', left: position.x + 'px', width: '300px' }"
        ref="chatWindow">
        <div class="flex justify-between items-center mb-4 cursor-move" @mousedown="startDrag">
        <h3 class="text-lg font-bold">Chat</h3>
        <button @click="close" class="text-gray-500 hover:text-gray-700">&times;</button>
        </div>
      <div class="h-64 overflow-y-auto mb-4 p-2 border rounded">
        <div v-for="(message, index) in messages" :key="index" class="mb-2">
          <div :class="message.sender === 'user' ? 'text-right' : 'text-left'">
            <span class="inline-block rounded px-2 py-1" :class="message.sender === 'user' ? 'bg-blue-100' : 'bg-gray-100'">
              {{ message.text }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex">
        <input v-model="userInput" @keyup.enter="sendMessage" type="text" placeholder="Type your message..." 
               class="flex-grow border rounded-l px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
        <button @click="sendMessage" 
                class="bg-blue-500 text-white px-4 py-1 rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
          Send
        </button>
      </div>
    </div>
</template>
  
  <script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { API_ENDPOINT } from '@/config'; // Make sure this points to your API endpoint


export default {
  props: {
    isOpen: Boolean,
    bookName: String, 
    fileName: String,
    bookId: String
  },
  emits: ['close'],
  setup(props, { emit }) {
    const isVisible = computed(() => props.isOpen);
    const messages = ref([]);
    const userInput = ref('');
    const position = ref({ x: 20, y: 20 });
    const isDragging = ref(false);
    const offset = ref({ x: 0, y: 0 });
    const chatWindow = ref(null);
    const isLoading = ref(false);


    const startDrag = (event) => {
      isDragging.value = true;
      offset.value = {
        x: event.clientX - position.value.x,
        y: event.clientY - position.value.y
      };
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    };

    const drag = (event) => {
      if (isDragging.value) {
        position.value = {
          x: event.clientX - offset.value.x,
          y: event.clientY - offset.value.y
        };
      }
    };

    const stopDrag = () => {
      isDragging.value = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    };

    const sendMessage = async () => {
      if (userInput.value.trim()) {
        const userMessage = userInput.value;
        messages.value.push({ sender: 'user', text: userMessage });
        userInput.value = '';
        isLoading.value = true;

        try {
          const response = await axios.post(`${API_ENDPOINT}/chat_with_book`, {
            query: userMessage,
            book_name: props.bookName,
            file_name: props.fileName,
            book_id: props.bookId
          });

          messages.value.push({ sender: 'app', text: response.data.response });
        } catch (error) {
          console.error('Error sending message:', error);
          messages.value.push({ sender: 'app', text: 'Sorry, there was an error processing your request.' });
        } finally {
          isLoading.value = false;
        }
      }
    };

    const close = () => {
      emit('close');
    };

    onMounted(() => {
      if (chatWindow.value) {
        const rect = chatWindow.value.getBoundingClientRect();
        position.value = { x: rect.left, y: rect.top };
      }
    });

    onUnmounted(() => {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    });

    return {
      messages,
      userInput,
      position,
      sendMessage,
      startDrag,
      chatWindow,
      close,
      isVisible
    };
  },
};
</script>
  
  <style scoped>
  .chat-window {
    resize: both;
    overflow: auto;
    min-width: 250px;
    min-height: 300px;
    max-width: 80vw;
    max-height: 80vh;
  }
  </style>