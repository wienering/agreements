export function AgreementMotionStyles() {
  return (
    <style jsx global>{`
      @keyframes agreement-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes agreement-slide-in {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes agreement-checkmark {
        0% {
          transform: scale(0.8);
          box-shadow: 0 0 0 0 rgba(63, 111, 79, 0.7);
        }
        50% {
          transform: scale(1.1);
          box-shadow: 0 0 0 20px rgba(63, 111, 79, 0);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(63, 111, 79, 0);
        }
      }
      @keyframes agreement-sent-toast {
        0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }
      .agreement-fade-in { animation: agreement-fade-in 0.3s ease-in-out; }
      .agreement-slide-in { animation: agreement-slide-in 0.4s ease-out; }
      .agreement-checkmark {
        animation: agreement-checkmark 0.6s ease-in-out;
        animation-fill-mode: forwards;
      }
      .agreement-sent-toast { animation: agreement-sent-toast 3s ease-in-out; }
    `}</style>
  );
}
