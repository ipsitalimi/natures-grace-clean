export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  section: string;
  actionLabel: string;
  duration?: string;
  body: string;
  price?: string;
  url?: string;
}

export const mockResources: ResourceItem[] = [
  {
    id: "course-reiki-1",
    title: "Reiki Level 1",
    description: "Begin your Reiki journey with foundational energy healing techniques and self-healing practices.",
    section: "Courses",
    actionLabel: "Enroll",
    price: "Rs 5,500",
    body: "Reiki Level 1 is the foundation of your energy healing journey. In this course, you will learn the history and principles of Reiki, how to channel universal life force energy, and techniques for self-healing.\n\nYou will receive your first attunement, which opens your energy channels and allows you to practice Reiki on yourself and others. This level focuses on physical healing and establishing a daily self-healing practice.\n\nBy the end of this course, you will be able to perform basic Reiki treatments and understand the fundamental concepts of energy flow and chakra balancing.",
  },
  {
    id: "course-reiki-2",
    title: "Reiki Level 2",
    description: "Deepen your practice with sacred symbols, distance healing, and emotional healing techniques.",
    section: "Courses",
    actionLabel: "Enroll",
    price: "Rs 6,500",
    body: "Reiki Level 2 takes your practice deeper with the introduction of three sacred Reiki symbols. These symbols amplify the energy flow and allow you to perform distance healing across time and space.\n\nYou will learn techniques for emotional and mental healing, working with past traumas, and sending healing energy to situations and relationships.\n\nThis level significantly increases the power of your Reiki practice and opens doors to professional healing work. We offer all levels up to Grandmaster level for those who wish to continue their journey.",
  },
  {
    id: "course-kids-reiki",
    title: "Kids Reiki Program",
    description: "A specially designed program introducing children to the gentle world of energy healing.",
    section: "Courses",
    actionLabel: "Enroll",
    price: "Rs 3,500",
    body: "The Kids Reiki Program is a gentle and age-appropriate introduction to energy healing for children. Through playful activities, guided meditations, and simple techniques, children learn to sense and work with healing energy.\n\nThis program helps children develop emotional awareness, manage stress and anxiety, improve focus and concentration, and build confidence.\n\nThe course includes child-friendly attunements and teaches simple self-healing practices that children can use in their daily lives. It is suitable for children aged 6 and above.",
  },
  {
    id: "course-switchwords",
    title: "Switchwords",
    description: "Master the art of Switchwords to manifest desires and shift energy patterns effectively.",
    section: "Courses",
    actionLabel: "Enroll",
    price: "Rs 4,000",
    body: "Switchwords are powerful one-word affirmations that can help you shift your energy and manifest your desires. In this comprehensive course, you will learn the science behind Switchwords, how they work with the subconscious mind, and how to use them effectively.\n\nYou will discover key Switchwords for abundance, health, relationships, protection, and personal growth. Learn to create personalized Switchword combinations and energy circles for specific goals.\n\nThis course empowers you with a practical tool that you can use anytime, anywhere to positively influence your life circumstances.",
  },
  {
    id: "course-tarot",
    title: "Tarot Reading Course",
    description: "Learn the art of Tarot reading for self-discovery, guidance, and intuitive development.",
    section: "Courses",
    actionLabel: "Enroll",
    price: "Rs 7,000",
    body: "The Tarot Reading Course is a comprehensive program that teaches you to read and interpret Tarot cards with confidence and clarity. You will learn the meanings of all 78 cards in the Major and Minor Arcana.\n\nThe course covers various spreads for different types of readings, intuitive development exercises, and ethical guidelines for reading for others.\n\nWhether you want to use Tarot for personal growth and self-reflection or as a professional practice, this course provides the knowledge and skills you need to become a confident Tarot reader.",
  },
  {
    id: "course-sujok-basic",
    title: "Su-Jok Course - Basic",
    description: "Learn the fundamentals of Su-Jok therapy for natural pain relief and wellness.",
    section: "Courses",
    actionLabel: "Enroll",
    price: "Rs 3,500",
    body: "Su-Jok therapy is a powerful healing method that uses pressure points on the hands and feet to treat various health conditions. In this basic course, you will learn the correspondence system of Su-Jok, where points on the hands and feet correspond to different organs and body parts.\n\nYou will learn to identify and stimulate these points using seeds, magnets, and finger pressure for pain relief and general wellness. The course covers basic techniques for common ailments like headaches, back pain, digestive issues, and stress.\n\nThis is a practical, hands-on course that gives you tools for natural, medicine-free healing.",
  },
  {
    id: "course-sujok-advance",
    title: "Su-Jok Course - Advanced",
    description: "Master advanced Su-Jok techniques including Six Ki, chakra balancing, and meridian therapy.",
    section: "Courses",
    actionLabel: "Enroll",
    price: "Rs 10,000",
    body: "The Advanced Su-Jok Course builds on the basic level and introduces sophisticated healing techniques. You will learn the Six Ki system, which works with the body's energy constitution for deeper healing.\n\nThe course covers advanced topics including chakra balancing through Su-Jok, meridian therapy, color therapy applications, and treatment protocols for chronic conditions.\n\nThis level prepares you for professional practice and equips you with comprehensive tools to address complex health challenges through the Su-Jok system.",
  },
  {
    id: "video-kids-reiki-1",
    title: "Kids Reiki",
    description: "Introduction to Reiki healing for children with gentle and fun energy exercises.",
    section: "Video Resources",
    actionLabel: "Watch",
    url: "https://youtube.com/shorts/X3T3PJqWAMs?si=E_IcCcw_v2ZOD6AE",
    body: "Watch this short video introducing kids to the beautiful world of Reiki energy healing.",
  },
  {
    id: "video-kids-reiki-2",
    title: "Kids Reiki - Healing Practice",
    description: "A guided kids Reiki healing session with simple techniques children can follow along.",
    section: "Video Resources",
    actionLabel: "Watch",
    url: "https://youtube.com/shorts/9vtM_d1Mt1U?feature=shared",
    body: "A short guided video showing kids how to practice Reiki healing in a fun and easy way.",
  },
  {
    id: "video-reiki-money",
    title: "Reiki for Money",
    description: "Learn how to use Reiki energy to attract abundance and financial prosperity.",
    section: "Video Resources",
    actionLabel: "Watch",
    url: "https://youtube.com/shorts/IU-9z1dA1uM?si=NMvxpVBzxXbIX1kn",
    body: "Discover how Reiki energy can be channeled to remove financial blocks and attract abundance into your life.",
  },
  {
    id: "video-reiki-business",
    title: "Reiki for Business Growth",
    description: "Apply Reiki healing techniques to energize and grow your business endeavors.",
    section: "Video Resources",
    actionLabel: "Watch",
    url: "https://youtube.com/shorts/vpryRTNeyp8?si=Xm2L26FpKJj3k5FH",
    body: "Learn how to use Reiki energy to support business growth, clear obstacles, and attract success.",
  },
  {
    id: "video-reiki-animals",
    title: "Reiki Healing for Animals",
    description: "Gentle Reiki healing techniques specially adapted for animal companions.",
    section: "Video Resources",
    actionLabel: "Watch",
    url: "https://youtube.com/shorts/YMVXsHUI6qE?si=zuK7f2fkIPZ4rCqD",
    body: "Explore how Reiki healing can benefit animals and learn techniques for healing your animal companions.",
  },
  {
    id: "video-switchword-positive",
    title: "Switchword for Positive Mindset",
    description: "Use powerful Switchwords to shift your mindset toward positivity and optimism.",
    section: "Video Resources",
    actionLabel: "Watch",
    url: "https://youtube.com/shorts/klbilltezow?si=etFWS4RG8G5sKuhW",
    body: "Learn specific Switchwords that can help you cultivate a positive mindset and shift your energy.",
  },
  {
    id: "video-sujok-headache",
    title: "Su-Jok Point for Headache",
    description: "Quick Su-Jok acupressure technique for natural headache relief without medicines.",
    section: "Video Resources",
    actionLabel: "Watch",
    url: "https://youtube.com/shorts/LbnQmP_lW78?si=GeubCJe_QFDoypG5",
    body: "Learn the specific Su-Jok pressure points on your hand that can provide quick, natural relief from headaches.",
  },
];
