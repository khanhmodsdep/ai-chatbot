'use client';

import { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiMessageSquare, FiInfo, FiX, FiClock } from 'react-icons/fi';
import { GoogleGenAI } from '@google/genai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Chat() {
  // API key trực tiếp trong code thay vì sử dụng env
  const API_KEY = 'AIzaSyBqQE0Rrt07nENoUCiva0BSVTo_mE7oxxk';
  
  // Initialize the Google Generative AI with new API
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 seconds

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Tin nhắn chào mừng tự động khi trang web được tải
  useEffect(() => {
    if (isFirstLoad) {
      const welcomeMessage: Message = {
        id: generateUniqueId(),
        role: 'assistant',
        content: "Xin chào! Tôi là trợ lý ảo được tạo ra bởi Khánh Mods và THPT Lương Thế Vinh. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể hỏi tôi về tỉnh Thái Nguyên, các vấn đề học tập, hay bất kỳ thông tin nào bạn cần.",
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      setIsFirstLoad(false);
    }
  }, [isFirstLoad]);

  useEffect(() => {
    scrollToBottom();
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [messages, isLoading]);

  // Tính năng thử lại tin nhắn khi gặp lỗi 429
  useEffect(() => {
    let retryTimer: NodeJS.Timeout;
    
    if (isRetrying && retryCount < MAX_RETRIES && lastUserMessage) {
      retryTimer = setTimeout(() => {
        callGeminiAPI(lastUserMessage);
      }, RETRY_DELAY);
    }
    
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isRetrying, retryCount, lastUserMessage]);

  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage(input);
  };

  // Tách phần gửi tin nhắn thành hàm riêng
  const sendMessage = async (message: string) => {
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setLastUserMessage(message);
    setRetryCount(0);
    setIsRetrying(false);

    await callGeminiAPI(message);
  };

  // Tách phần gọi API thành hàm riêng để có thể thử lại, sử dụng SDK
  const callGeminiAPI = async (message: string) => {
    try {
      // Sử dụng new Google GenAI SDK như ví dụ
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: message,
      });
      
      const text = response.text;
      
      if (!text) {
        throw new Error("Không nhận được phản hồi từ API");
      }
      
      const assistantMessage: Message = {
        id: generateUniqueId(),
        role: 'assistant',
        content: text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsRetrying(false);
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.';
      
      // Xử lý lỗi API limits
      if (error instanceof Error) {
        const errorString = error.toString().toLowerCase();
        if (
          errorString.includes('429') || 
          errorString.includes('quota') || 
          errorString.includes('limit') ||
          errorString.includes('too many requests')
        ) {
          if (retryCount < MAX_RETRIES) {
            setIsRetrying(true);
            setRetryCount(prev => prev + 1);
            setError(`Quá nhiều yêu cầu. Đang thử lại (${retryCount + 1}/${MAX_RETRIES})...`);
            return;
          } else {
            errorMessage = 'Hệ thống đang nhận quá nhiều yêu cầu. Vui lòng đợi một lát và thử lại sau.';
          }
        }
      }
      
      setError(errorMessage);
      setIsRetrying(false);
    } finally {
      if (!isRetrying) {
        setIsLoading(false);
      }
    }
  };

  // Hàm thử lại tin nhắn cuối cùng
  const handleRetry = () => {
    if (lastUserMessage && !isLoading && !isRetrying) {
      setRetryCount(0);
      setError(null);
      setIsLoading(true);
      callGeminiAPI(lastUserMessage);
    }
  };

  // Hàm xử lý phím tắt
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Gửi tin nhắn khi nhấn Enter (không có Shift)
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Hàm để xử lý hiển thị tin nhắn có chứa định dạng Markdown
  const formatMessageContent = (content: string) => {
    // Mảng để lưu các phần tử JSX đã được xử lý
    const result: JSX.Element[] = [];
    
    // Chia nội dung thành các dòng
    const lines = content.split('\n');
    
    // Biến để theo dõi danh sách hiện tại
    let currentList: JSX.Element[] = [];
    let inList = false;
    
    lines.forEach((line, lineIndex) => {
      // Xử lý dòng có dấu * hoặc - ở đầu (danh sách)
      if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
        inList = true;
        // Xử lý phần còn lại của dòng với định dạng markdown
        const listItemContent = formatMarkdownText(line.trim().substring(1).trim());
        currentList.push(<li key={`li-${lineIndex}`}>{listItemContent}</li>);
      } else {
        // Nếu đang trong danh sách mà gặp dòng không phải danh sách
        if (inList) {
          result.push(<ul key={`ul-${lineIndex}`}>{currentList}</ul>);
          currentList = [];
          inList = false;
        }
        
        // Xử lý dòng thông thường với định dạng markdown
        result.push(
          <div key={`line-${lineIndex}`}>
            {formatMarkdownText(line)}
            {lineIndex < lines.length - 1 && <br />}
          </div>
        );
      }
    });
    
    // Kiểm tra nếu vẫn còn phần tử trong danh sách khi kết thúc
    if (inList && currentList.length > 0) {
      result.push(<ul key="ul-last">{currentList}</ul>);
    }
    
    return result;
  };
  
  // Hàm xử lý các định dạng Markdown trong văn bản
  const formatMarkdownText = (text: string) => {
    if (!text) return null;
    
    // Mảng chứa các phần tử đã được xử lý
    const elements: JSX.Element[] = [];
    
    // Xử lý chữ in đậm (**text**)
    let boldPattern = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldPattern.exec(text)) !== null) {
      // Thêm văn bản trước phần in đậm
      if (match.index > lastIndex) {
        elements.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
      }
      
      // Thêm phần in đậm
      elements.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
      
      lastIndex = match.index + match[0].length;
    }
    
    // Thêm phần còn lại của văn bản
    if (lastIndex < text.length) {
      elements.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }
    
    return elements.length > 0 ? elements : <span>{text}</span>;
  };

  // Làm sạch lịch sử trò chuyện
  const clearChat = () => {
    const welcomeMessage: Message = {
      id: generateUniqueId(),
      role: 'assistant',
      content: "Xin chào! Tôi là trợ lý ảo được tạo ra bởi Khánh Mods và THPT Lương Thế Vinh. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể hỏi tôi về tỉnh Thái Nguyên, các vấn đề học tập, hay bất kỳ thông tin nào bạn cần.",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
    setLastUserMessage('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="chat-container" ref={chatContainerRef}>
      <div className="chat-header">
        <div className="chat-header-title">
          <FiMessageSquare size={20} />
          <span>Gemini Chat</span>
        </div>
        <div className="chat-header-badge">
          Gemini 2.5 Flash
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FiMessageSquare />
            </div>
            <h3 className="empty-state-title">Bắt đầu một cuộc trò chuyện</h3>
            <p className="empty-state-description">
              Hãy gửi tin nhắn để trò chuyện với Gemini. Bạn có thể hỏi về thông tin, viết văn bản, hay yêu cầu trợ giúp với nhiều chủ đề khác nhau.
            </p>
          </div>
        ) : (
          <>
            <div className="messages-container">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
                >
                  <div className={`message-avatar ${message.role === 'user' ? 'avatar-user' : 'avatar-assistant'}`}>
                    {message.role === 'user' ? <FiUser size={14} /> : <FiMessageSquare size={14} />}
                  </div>
                  <div className="message-bubble">
                    <div className="message-content">
                      {formatMessageContent(message.content)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {messages.length > 0 && (
              <button 
                onClick={clearChat}
                className="clear-chat-button"
                aria-label="Xóa lịch sử trò chuyện"
              >
                Bắt đầu lại cuộc trò chuyện
              </button>
            )}
          </>
        )}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar avatar-assistant">
              <FiMessageSquare size={14} />
            </div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <FiInfo size={16} />
            <span>{error}</span>
            <div className="error-actions">
              {error.includes('quá nhiều yêu cầu') && (
                <button 
                  onClick={handleRetry}
                  className="retry-button"
                  disabled={isLoading || isRetrying}
                >
                  <FiClock size={14} />
                  Thử lại
                </button>
              )}
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-google-red hover:text-google-red/80"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi điều gì đó..."
            className="chat-input"
            maxLength={500}
            disabled={isRetrying}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || isRetrying}
            className="send-button"
            aria-label="Gửi tin nhắn"
          >
            <FiSend size={18} />
          </button>
        </form>
      </div>
    </div>
  );
} 
