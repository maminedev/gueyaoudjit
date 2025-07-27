import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as Z from "zod";
import emailjs from "@emailjs/browser";
import { useState } from "react";
import { CheckCircle, Send, Loader2 } from "lucide-react";

const contactFormSchema = Z.object({
  name: Z.string().nonempty("Name is required"),
  email: Z.string().email("Invalid email").nonempty("Email is required"),
  subject: Z.string().nonempty("Subject is required"),
  message: Z.string().nonempty("Message is required"),
});

const initialValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const ContactForm = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: initialValues,
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    setSuccess(false);
    
    try {
      const payload = {
        from_name: data.name,
        to_name: "Gueya Oudjit",
        message: data.message,
        reply_to: data.email,
        subject: data.subject,
      };

      const serviceID = import.meta.env.VITE_EMAIL_SERVICE_ID;
      const templateID = import.meta.env.VITE_EMAIL_TEMPLATE_ID;
      const userID = import.meta.env.VITE_EMAIL_PUBLIC_KEY;

      await emailjs.send(serviceID, templateID, payload, {
        publicKey: userID,
      });
      
      setSuccess(true);
      reset(initialValues);
      
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 2000);
      
    } catch (error) {
      console.log("FAILED...", error);
      setError("Failed to send message. Please try again or contact me directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center">
      {success ? (
        <div className="w-full text-center py-12 animate-fadeIn">
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="w-16 h-16 text-green-400 animate-pulse" />
            <h3 className="text-2xl font-bold text-white">Message Sent Successfully!</h3>
            <p className="text-gray-400">Thank you for reaching out. I'll get back to you soon.</p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-4 px-6 py-2 bg-white text-black rounded-md hover:bg-gray-200 transition-all duration-300"
            >
              Send Another Message
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full text-[#a7a7a7] flex flex-col gap-6 animate-slideInUp"
        >
        <div className="group">
          <label
            className="block text-white md:text-xl text-lg font-semibold mb-3 transition-colors duration-200 group-focus-within:text-blue-400"
            htmlFor="name"
          >
            Full Name *
          </label>
          <input
            {...register("name")}
            type="text"
            id="name"
            placeholder="Enter your full name"
            className="w-full px-5 py-4 font-light md:text-base text-sm placeholder:text-gray-500 bg-black bg-opacity-50 border border-white border-opacity-20 rounded-lg text-white transition-all duration-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 focus:outline-none hover:border-opacity-40"
          />
          {errors.name && (
            <span className="text-red-400 text-sm mt-1 block animate-shake">{errors.name.message}</span>
          )}
        </div>

        <div className="group">
          <label
            className="block text-white md:text-xl text-lg font-semibold mb-3 transition-colors duration-200 group-focus-within:text-blue-400"
            htmlFor="email"
          >
            Email Address *
          </label>
          <input
            type="email"
            {...register("email")}
            id="email"
            placeholder="your.email@example.com"
            className="w-full px-5 py-4 font-light md:text-base text-sm placeholder:text-gray-500 bg-black bg-opacity-50 border border-white border-opacity-20 rounded-lg text-white transition-all duration-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 focus:outline-none hover:border-opacity-40"
          />
          {errors.email && (
            <span className="text-red-400 text-sm mt-1 block animate-shake">{errors.email.message}</span>
          )}
        </div>

        <div className="group">
          <label
            className="block text-white md:text-xl text-lg font-semibold mb-3 transition-colors duration-200 group-focus-within:text-blue-400"
            htmlFor="subject"
          >
            Subject *
          </label>
          <input
            {...register("subject")}
            type="text"
            id="subject"
            placeholder="What would you like to discuss?"
            className="w-full px-5 py-4 font-light md:text-base text-sm placeholder:text-gray-500 bg-black bg-opacity-50 border border-white border-opacity-20 rounded-lg text-white transition-all duration-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 focus:outline-none hover:border-opacity-40"
          />
          {errors.subject && (
            <span className="text-red-400 text-sm mt-1 block animate-shake">{errors.subject.message}</span>
          )}
        </div>

        <div className="group">
          <label
            className="block text-white md:text-xl text-lg font-semibold mb-3 transition-colors duration-200 group-focus-within:text-blue-400"
            htmlFor="message"
          >
            Message *
          </label>
          <textarea
            id="message"
            {...register("message")}
            placeholder="Tell me about your project, ideas, or just say hello!"
            rows="6"
            className="w-full px-5 py-4 font-light md:text-base text-sm placeholder:text-gray-500 bg-black bg-opacity-50 border border-white border-opacity-20 rounded-lg text-white transition-all duration-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 focus:outline-none hover:border-opacity-40 resize-vertical min-h-[150px]"
          ></textarea>
          {errors.message && (
            <span className="text-red-400 text-sm mt-1 block animate-shake">{errors.message.message}</span>
          )}
        </div>

        {error && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-400 px-4 py-3 rounded-lg animate-shake">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full py-4 bg-gradient-to-r from-white to-gray-100 text-black font-semibold rounded-lg hover:from-gray-100 hover:to-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending Message...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                <span>Send Message</span>
              </>
            )}
          </div>
        </button>
        </form>
      )}
    </div>
  );
};

export default ContactForm;
