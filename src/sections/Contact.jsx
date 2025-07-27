import TitleHeader from "../components/TitleHeader";
import ContactExperience from "../components/ContactExperience";
import ContactForm from "../components/ContactForm";
import { Mail, Phone, MapPin, Github, Linkedin } from "lucide-react";

const Contact = () => {
  return (
    <section id="contact" className="flex-center md:p-0 px-5 relative">
      <div className="w-full h-full container md:my-40 my-20">
        <TitleHeader
          title="Let's Work Together"
          number="04"
          text="Ready to bring your ideas to life? Let's create something amazing together."
        />
        <div className="mt-20">
          <div className="grid grid-cols-12 gap-8">
            <div className="md:col-span-6 col-span-12 md:order-none order-1 relative z-10">
              <div className="bg-black bg-opacity-30 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-10">
                <h3 className="text-2xl font-bold text-white mb-6">Get In Touch</h3>
                <ContactForm />
              </div>
              
              {/* Contact Information */}
              <div className="mt-8 bg-black bg-opacity-30 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-10">
                <h4 className="text-xl font-bold text-white mb-4">Contact Information</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <span>gaiaoudjit@gmail.com</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                    <Phone className="w-5 h-5 text-green-400" />
                    <span>+213 795 897 067</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                    <MapPin className="w-5 h-5 text-red-400" />
                    <span>Bali, Indonesia</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-white border-opacity-10">
                  <h5 className="text-lg font-semibold text-white mb-3">Follow Me</h5>
                  <div className="flex gap-4">
                    <a href="#" className="p-2 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all duration-300 group">
                      <Github className="w-5 h-5 text-gray-300 group-hover:text-white" />
                    </a>
                    <a href="#" className="p-2 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all duration-300 group">
                      <Linkedin className="w-5 h-5 text-gray-300 group-hover:text-blue-400" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-6 col-span-12">
              <div className="w-full h-full min-h-[600px] relative">
                <ContactExperience />
                
                {/* Floating availability indicator */}
                <div className="absolute top-6 right-6 bg-green-500 bg-opacity-20 backdrop-blur-sm border border-green-500 border-opacity-30 rounded-full px-4 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">Available for projects</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
