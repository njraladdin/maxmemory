import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

function LandingPage() {
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [messages, setMessages] = useState([{ type: 'assistant', text: 'How can I help you today?' }]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const inputBoxRef = useRef(null);
  const submitButtonRef = useRef(null);
  const typeIntervalRef = useRef(null);

  const examples = [
    {
      question: "🐕 Which type of food should I get for my dog?",
      memories: [
        "[2024-02-15] Max is allergic to chicken-based foods",
        "[2024-03-01] Vet recommended grain-free diet for better digestion",
        "[2024-03-10] Dog shows preference for salmon-based kibble"
      ],
      answer: "Based on your dog's history, I recommend a grain-free salmon-based dog food. This aligns with both the vet's recommendation for a grain-free diet and your dog's preference for salmon. Most importantly, it avoids chicken which your dog is allergic to. Look for brands that specialize in limited ingredient formulas to minimize any potential allergic reactions."
    },
    {
      question: "💻 Can you help me with my Python project?",
      memories: [
        "[2024-03-01] Working on a data visualization project using matplotlib",
        "[2024-03-05] Struggling with pandas DataFrame operations",
        "[2024-03-10] Project deadline is March 20th"
      ],
      answer: "Looking at your ongoing project, I can help with your data visualization work in matplotlib and pandas operations. Given your deadline is March 20th, let's focus on the specific DataFrame challenges you're facing. What particular pandas operation are you struggling with?"
    },
    {
      question: "🥗 What was that recipe you suggested for meal prep?",
      memories: [
        "[2024-02-20] Discussed high-protein vegetarian meals",
        "[2024-02-25] Mentioned quinoa and black bean bowl recipe",
        "[2024-03-05] User has nut allergies",
        "[2024-03-08] Prefers meals under 30 minutes prep time"
      ],
      answer: "Based on our previous discussions, I'd recommend the quinoa and black bean bowl recipe we talked about. It's high in protein, nut-free for your allergies, and takes only 25 minutes to prepare. The recipe includes quinoa, black beans, roasted vegetables, and a lime-cilantro dressing - all aligned with your dietary preferences."
    }
  ];

  const faqItems = [
    {
      question: "Where is my chat data stored?",
      answer: "All your chat memories are stored locally in your browser. We don't collect or store any of your data on external servers, ensuring complete privacy and control over your information."
    },
    {
      question: "Do I have to pay for the Google API key?",
      answer: "No! Google provides free API keys with generous free usage limits. Most users won't ever exceed the free tier limits. You only need to create a free Google Cloud account to get your API key."
    },
    {
      question: "How does MaxMemory work?",
      answer: "MaxMemory automatically captures important information from your chat conversations. When you ask a new question, it intelligently retrieves relevant past context and includes it in your prompt, helping the AI provide more consistent and contextual responses."
    },
    {
      question: "Can I control what gets remembered?",
      answer: "Yes! MaxMemory has an intuitive interface that lets you view, manage, and delete your stored memories at any time. You're in complete control of what information is kept and what is removed."
    },
    {
      question: "Will this slow down my chat experience?",
      answer: "Not at all! MaxMemory is designed to be lightweight and efficient. Since everything is stored locally, memory retrieval is nearly instantaneous and won't impact your chat experience."
    },
    {
      question: "Does it work with both ChatGPT and Claude?",
      answer: "Yes! MaxMemory is fully compatible with both ChatGPT and Claude. It seamlessly integrates with both platforms while maintaining the same great user experience."
    }
  ];

  const handleInputChange = (e) => {
    setInputText(e.currentTarget.textContent || '');
  };

  const handleSubmit = () => {
    const currentExample = examples[currentExampleIndex];
    
    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      text: currentExample.question,
      memories: currentExample.memories
    }]);
    
    // Clear input
    if (inputBoxRef.current) {
      inputBoxRef.current.textContent = '';
    }
    
    // Add initial AI message
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'assistant',
        text: ''
      }]);

      // Stream the response word by word
      const words = currentExample.answer.split(' ');
      let wordIndex = 0;

      const streamInterval = setInterval(() => {
        if (wordIndex < words.length) {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            lastMessage.text = currentExample.answer
              .split(' ')
              .slice(0, wordIndex + 1)
              .join(' ');
            return newMessages;
          });
          wordIndex++;
        } else {
          clearInterval(streamInterval);
          // Move to next example after delay
          setTimeout(() => {
            setCurrentExampleIndex((prev) => (prev + 1) % examples.length);
            startAnimation();
          }, 2000);
        }
      }, 50);
    }, 1000);
  };

  const startAnimation = () => {
    // Clear any existing interval
    if (typeIntervalRef.current) {
      clearInterval(typeIntervalRef.current);
    }

    // Clear messages except initial greeting
    setMessages([{ type: 'assistant', text: 'How can I help you today?' }]);
    
    // Clear input
    if (inputBoxRef.current) {
      inputBoxRef.current.textContent = '';
    }
    
    // Type the question
    const currentExample = examples[currentExampleIndex];
    let charIndex = 0;
    
    typeIntervalRef.current = setInterval(() => {
      if (charIndex <= currentExample.question.length) {
        if (inputBoxRef.current) {
          inputBoxRef.current.textContent = currentExample.question.slice(0, charIndex);
        }
        charIndex++;
      } else {
        clearInterval(typeIntervalRef.current);
        
        // Trigger submit after typing is done
        if (submitButtonRef.current) {
          submitButtonRef.current.classList.add('active');
          setTimeout(() => {
            submitButtonRef.current?.classList.remove('active');
            handleSubmit();
          }, 800);
        }
      }
    }, 50);
  };

  // Clean up the interval when component unmounts or example changes
  useEffect(() => {
    const timeoutId = setTimeout(startAnimation, 500);
    
    return () => {
      clearTimeout(timeoutId);
      if (typeIntervalRef.current) {
        clearInterval(typeIntervalRef.current);
      }
    };
  }, [currentExampleIndex]);

  return (
    <div className="container">
      <section className="hero">
        <div className="header-nav">
          <h1>MaxMemory</h1>
          <Link to="/payments" className="nav-link">Payments</Link>
        </div>
        <div className="hero-description">
          <p>Add infinite long-term memory to ChatGPT and Claude while keeping your data private. All memories are stored locally in your browser - no external servers, no data collection.</p>
          <div className="works-with">
            <span className="works-with-text">Works with</span>
            <div className="ai-icons">
              <div className="ai-icon">
                {/* ChatGPT SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" viewBox="0 0 512 512">
                  <rect fill="#10A37F" width="512" height="512" rx="104.187" ry="105.042"/>
                  <path fill="#fff" fillRule="nonzero" d="M378.68 230.011a71.432 71.432 0 003.654-22.541 71.383 71.383 0 00-9.783-36.064c-12.871-22.404-36.747-36.236-62.587-36.236a72.31 72.31 0 00-15.145 1.604 71.362 71.362 0 00-53.37-23.991h-.453l-.17.001c-31.297 0-59.052 20.195-68.673 49.967a71.372 71.372 0 00-47.709 34.618 72.224 72.224 0 00-9.755 36.226 72.204 72.204 0 0018.628 48.395 71.395 71.395 0 00-3.655 22.541 71.388 71.388 0 009.783 36.064 72.187 72.187 0 0077.728 34.631 71.375 71.375 0 0053.374 23.992H271l.184-.001c31.314 0 59.06-20.196 68.681-49.995a71.384 71.384 0 0047.71-34.619 72.107 72.107 0 009.736-36.194 72.201 72.201 0 00-18.628-48.394l-.003-.004z"/>
                </svg>
              </div>
              <span className="works-with-text">and</span>
              <div className="ai-icon">
                {/* Claude SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" viewBox="0 0 512 512">
                  <rect fill="#CC9B7A" width="512" height="512" rx="104.187" ry="105.042"/>
                  <path fill="#1F1F1E" fillRule="nonzero" d="M318.663 149.787h-43.368l78.952 212.423 43.368.004-78.952-212.427zm-125.326 0l-78.952 212.427h44.255l15.932-44.608 82.846-.004 16.107 44.612h44.255l-79.126-212.427h-45.317zm-4.251 128.341l26.91-74.701 27.083 74.701h-53.993z"/>
                </svg>
              </div>
            </div>
          </div>
          <a href="https://chromewebstore.google.com/detail/memory-vault-infinite-lon/bdmhcmmcjkgnecahmeahfbjjelkbliea" className="cta-button">
          <svg height="26" width="26" xmlns="http://www.w3.org/2000/svg" viewBox="-1.67 -1.67 24.24 24.24" fill="#ffffff" stroke="#ffffff" strokeWidth="0.00020904000000000002">
            <g>
              <path fill="#f2f2f2" d="M10.656,5.333c-1.859,0-3.372,1.509-3.372,3.373c0,1.861,1.513,3.37,3.372,3.37 c1.863,0,3.37-1.509,3.37-3.37C14.026,6.842,12.52,5.333,10.656,5.333z"></path>
              <path fill="#f2f2f2" d="M6.561,6.708c0.74-1.517,2.293-2.565,4.096-2.565c2.073,0,3.82,1.383,4.375,3.278 c2.158-0.229,3.899,0.585,5.637,0.848c-1.018-4.712-5.202-8.247-10.217-8.247c-1.942,0-3.753,0.54-5.313,1.462 C5.033,2.69,5.468,5.926,6.561,6.708z"></path>
              <path fill="#f2f2f2" d="M20.856,9.521c-1.703-0.414-3.77-1.526-5.647-0.992c0.004,0.059,0.011,0.115,0.011,0.176 c0,2.518-2.044,4.562-4.563,4.562c-0.095,0-0.185-0.01-0.276-0.016c-1.001,1.314-2.618,2.934-3.154,3.674 c1.256,1.209,2.667,3.422,3.729,3.958c5.637-0.155,9.948-4.734,9.948-10.409C20.903,10.152,20.884,9.835,20.856,9.521z"></path>
              <path fill="#f2f2f2" d="M9.032,12.964c-1.717-0.656-2.937-2.313-2.937-4.258c0-0.25,0.026-0.494,0.064-0.731 C4.558,6.792,4.164,3.969,4.024,2.242C1.58,4.156,0,7.127,0,10.475c0,0.306,0.021,0.611,0.047,0.91 c0.195,1.493,0.66,2.965,1.353,4.295c1.65,2.87,4.62,4.877,8.081,5.197c-1.194-1.319-2.716-2.651-3.673-4.181 C6.782,15.41,8.214,14.418,9.032,12.964z"></path>
            </g>
          </svg>
            Add to Chrome - It's Free
          </a>
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-title">
          <h2>See It In Action</h2>
          <p>Watch how MaxMemory works with your AI conversations</p>
        </div>
        <div className="demo-container">
          <div className="chat-interface">
            <div className="chat-messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.type} fade-up`}>
                  {message.type === 'user' && message.memories && (
                    <div className="memory-section">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        <path d="M12 8v4l3 3"></path>
                      </svg>
                      <div className="memories-content">
                        {message.memories.map((memory, i) => (
                          <div key={i} className="memory">{memory}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="message-text">{message.text}</div>
                </div>
              ))}
            </div>
            
            <div className="input-area">
              <div 
                className="input-box" 
                ref={inputBoxRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleInputChange}
              >
                {inputText}
              </div>
              <button
                className="submit-button"
                ref={submitButtonRef}
                onClick={handleSubmit}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M7 11l5-5m0 0l5 5m-5-5v12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="faq">
        <div className="faq-title">
          <h2>Frequently Asked Questions</h2>
        </div>
        {faqItems.map((faq, index) => (
          <div 
            key={index} 
            className={`faq-item ${activeFaq === index ? 'active' : ''}`} 
            onClick={() => setActiveFaq(activeFaq === index ? null : index)}
          >
            <div className="faq-question">
              <span>{faq.question}</span>
              <svg 
                className="chevron" 
                width="14" 
                height="14" 
                viewBox="0 0 14 14"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M3 5L7 9L11 5" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="faq-answer">
              <div className="faq-answer-content">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </section>

      <footer className="privacy-footer">
        <a 
          href="/privacy-policy.html" 
          className="privacy-link"
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}

export default LandingPage; 