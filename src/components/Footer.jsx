import { footerIconsList } from "../constants";

const Footer = () => {
  return (
    <div className="w-full flex-center flex-col md:gap-10 gap-7 bg-black py-10">
      <div className="text-xl font-bold gradient-title">
        GO
      </div>
      <div className="flex items-center md:gap-16 gap-8">
        {footerIconsList.map((icon, index) => (
          <a
            key={index}
            href={icon.href}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer hover:-translate-y-5 transition-all duration-700"
          >
            <img
              src={icon.icon}
              alt={icon.name}
              className="md:size-10 size-8"
            />
          </a>
        ))}
      </div>
      <p className="font-regular md:text-lg text-sm">
        2025 © All rights reserved.
      </p>
    </div>
  );
};

export default Footer;
