import Chat from '@/components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="app-container">
        <header className="app-header">
          <div className="flex items-center justify-center mb-5 sm:mb-6">
            <div className="flex items-center">
              <span className="text-google-blue font-medium text-3xl md:text-4xl mr-1">G</span>
              <span className="text-google-red font-medium text-3xl md:text-4xl mr-1">e</span>
              <span className="text-google-yellow font-medium text-3xl md:text-4xl mr-1">m</span>
              <span className="text-google-blue font-medium text-3xl md:text-4xl mr-1">i</span>
              <span className="text-google-green font-medium text-3xl md:text-4xl mr-1">n</span>
              <span className="text-google-red font-medium text-3xl md:text-4xl">i</span>
            </div>
          </div>
          <h1 className="app-title">Trợ lý trò chuyện AI</h1>
          <p className="app-description">
            Đặt câu hỏi, nhận câu trả lời, và khám phá khả năng của trí tuệ nhân tạo thế hệ mới.
          </p>
        </header>
        
        <Chat />
        
        <div className="text-center text-google-dark-grey text-xs mt-4 mb-6">
          © {new Date().getFullYear()} Khánh Mods
        </div>
      </div>
    </main>
  );
}
