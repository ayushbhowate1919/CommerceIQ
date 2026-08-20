export type SeedProduct = {
  name: string;
  sku: string;
  category: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  status: string;
};

export type SeedCustomer = {
  name: string;
  email: string;
  city: string;
  segment: 'VIP' | 'Regular' | 'New' | 'At-Risk';
};

export type SeedReviewTemplate = {
  rating: number;
  text: string;
  verifiedPurchase: boolean;
  aiAnalysis: {
    sentiment: 'positive' | 'neutral' | 'negative';
    topics: string[];
    summary: string;
    suggestedAction: string;
  };
};

export const RAW_PRODUCTS: SeedProduct[] = [
  // Electronics (12 items)
  { name: 'Ultra-Slim Noise Cancelling Wireless Headphones', sku: 'ELEC-HEAD-001', category: 'Electronics', description: 'Premium over-ear headphones with active noise cancellation and 30h battery life.', price: 199.99, costPrice: 85.00, stock: 45, reorderLevel: 10, status: 'active' },
  { name: 'Ergonomic Mechanical Gaming Keyboard RGB', sku: 'ELEC-KEYB-002', category: 'Electronics', description: 'Tactile mechanical switches with customizable RGB backlighting and wrist rest.', price: 119.99, costPrice: 52.00, stock: 30, reorderLevel: 8, status: 'active' },
  { name: 'Precision Wireless Vertical Ergonomic Mouse', sku: 'ELEC-MOUS-003', category: 'Electronics', description: 'Reduces wrist strain with 4000 DPI sensor and rechargeable dual-mode connectivity.', price: 49.99, costPrice: 18.50, stock: 120, reorderLevel: 15, status: 'active' },
  { name: '4K Ultra HD Dual Monitor Arm Desk Mount', sku: 'ELEC-ARMS-004', category: 'Electronics', description: 'Heavy-duty aluminum gas-spring arm supports up to 32-inch monitors.', price: 79.99, costPrice: 32.00, stock: 18, reorderLevel: 5, status: 'active' },
  { name: 'Smartwatch Series Pro with Fitness & ECG Tracking', sku: 'ELEC-WATC-005', category: 'Electronics', description: 'AMOLED display, heart rate monitor, sleep tracking, and 7-day battery life.', price: 149.99, costPrice: 65.00, stock: 60, reorderLevel: 12, status: 'active' },
  { name: 'Magnetic 3-in-1 Fast Wireless Charging Station', sku: 'ELEC-CHAR-006', category: 'Electronics', description: 'Folds flat for travel, fast charges phone, earbuds, and smartwatch simultaneously.', price: 39.99, costPrice: 14.00, stock: 85, reorderLevel: 20, status: 'active' },
  { name: 'HD 1080p Webcam with Dual Microphones & Privacy Cover', sku: 'ELEC-CAM-007', category: 'Electronics', description: 'Auto-focus lens and noise-reduction microphones ideal for video conferencing.', price: 59.99, costPrice: 22.00, stock: 7, reorderLevel: 10, status: 'active' }, // Low stock warning
  { name: 'Portable Bluetooth 5.3 Waterproof Speaker', sku: 'ELEC-SPK-008', category: 'Electronics', description: 'IPX7 rating, deep bass, 360-degree sound, and 20-hour playback time.', price: 69.99, costPrice: 28.00, stock: 40, reorderLevel: 10, status: 'active' },
  { name: 'USB-C 10-in-1 Multiport Adapter Hub', sku: 'ELEC-HUB-009', category: 'Electronics', description: '4K HDMI, Ethernet, SD reader, and 100W Power Delivery pass-through charging.', price: 44.99, costPrice: 16.00, stock: 95, reorderLevel: 15, status: 'active' },
  { name: 'Noise Isolating True Wireless Earbuds', sku: 'ELEC-EARB-010', category: 'Electronics', description: 'Compact charging case, IPX5 water resistance, and crystal-clear call microphone.', price: 79.99, costPrice: 30.00, stock: 0, reorderLevel: 10, status: 'active' }, // Stockout
  { name: 'High-Speed Wi-Fi 6 Dual-Band Mesh Router', sku: 'ELEC-ROUT-011', category: 'Electronics', description: 'Covers up to 3000 sq ft with seamless roaming and advanced threat protection.', price: 129.99, costPrice: 55.00, stock: 22, reorderLevel: 5, status: 'active' },
  { name: 'Smart Home LED Ambient Lighting Strip 10m', sku: 'ELEC-LIGHT-012', category: 'Electronics', description: 'Voice compatible with Alexa & Google Assistant, music sync, and 16M colors.', price: 29.99, costPrice: 9.50, stock: 110, reorderLevel: 25, status: 'active' },

  // Apparel (10 items)
  { name: '100% Organic Heavyweight Cotton Crewneck Hoodie', sku: 'APPR-HOOD-001', category: 'Apparel', description: 'Pre-shrunk ultra-soft fleece hoodie designed for timeless everyday wear.', price: 64.99, costPrice: 24.00, stock: 75, reorderLevel: 15, status: 'active' },
  { name: 'Breathable Performance Athletic Training Tee', sku: 'APPR-TEE-002', category: 'Apparel', description: 'Moisture-wicking, four-way stretch fabric engineered for high intensity workouts.', price: 29.99, costPrice: 9.00, stock: 150, reorderLevel: 25, status: 'active' },
  { name: 'Slim-Fit Stretch Denim Jeans Dark Wash', sku: 'APPR-JEAN-003', category: 'Apparel', description: 'Classic 5-pocket styling with responsive stretch cotton blending durability with comfort.', price: 79.99, costPrice: 28.00, stock: 50, reorderLevel: 10, status: 'active' },
  { name: 'Water-Resistant Lightweight Packable Windbreaker', sku: 'APPR-JACK-004', category: 'Apparel', description: 'Stows into its own pocket with adjustable hood and elastic cuffs.', price: 89.99, costPrice: 34.00, stock: 35, reorderLevel: 8, status: 'active' },
  { name: 'Merino Wool Thermal Quarter-Zip Pullover', sku: 'APPR-PULL-005', category: 'Apparel', description: 'Natural temperature regulating merino wool ideal for layering in cold weather.', price: 109.99, costPrice: 42.00, stock: 4, reorderLevel: 10, status: 'active' }, // Low stock
  { name: 'Relaxed Fit Utility Cargo Jogger Pants', sku: 'APPR-PANT-006', category: 'Apparel', description: 'Durable ripstop cotton fabric with multiple secure cargo pockets.', price: 54.99, costPrice: 19.50, stock: 65, reorderLevel: 12, status: 'active' },
  { name: 'Classic Tailored Oxford Button-Down Shirt', sku: 'APPR-SHRT-007', category: 'Apparel', description: 'Wrinkle-resistant woven cotton oxford shirt suitable for work or leisure.', price: 49.99, costPrice: 17.00, stock: 80, reorderLevel: 15, status: 'active' },
  { name: 'Seamless High-Waisted Active Yoga Leggings', sku: 'APPR-LEGG-008', category: 'Apparel', description: 'Squat-proof compression fabric with side drop-in phone pocket.', price: 44.99, costPrice: 15.00, stock: 110, reorderLevel: 20, status: 'active' },
  { name: 'All-Weather Insulated Puffer Vest', sku: 'APPR-VEST-009', category: 'Apparel', description: 'Synthetic down insulation providing lightweight warmth without bulk.', price: 74.99, costPrice: 26.00, stock: 28, reorderLevel: 5, status: 'active' },
  { name: 'Vintage Washed Graphic Graphic Sweatshirt', sku: 'APPR-SWEAT-010', category: 'Apparel', description: 'Retro aesthetic wash with ribbed neck collar and relaxed silhouette.', price: 59.99, costPrice: 21.00, stock: 42, reorderLevel: 10, status: 'active' },

  // Accessories (10 items)
  { name: 'Genuine Italian Leather Bifold Wallet with RFID Blocking', sku: 'ACCS-WALL-001', category: 'Accessories', description: 'Handcrafted full-grain leather with dedicated card slots and bill compartment.', price: 45.00, costPrice: 15.00, stock: 90, reorderLevel: 15, status: 'active' },
  { name: 'Water-Resistant Laptop Backpack with USB Port', sku: 'ACCS-BAG-002', category: 'Accessories', description: 'Fits up to 15.6 inch laptops with hidden anti-theft pocket and luggage strap.', price: 69.99, costPrice: 25.00, stock: 65, reorderLevel: 12, status: 'active' },
  { name: 'Polarized Aviator Sunglasses UV400 Protection', sku: 'ACCS-SUNG-003', category: 'Accessories', description: 'Lightweight metal frame with glare-reducing polarized TAC lenses.', price: 34.99, costPrice: 10.00, stock: 130, reorderLevel: 20, status: 'active' },
  { name: 'Insulated Stainless Steel Water Bottle 32oz', sku: 'ACCS-BOTT-004', category: 'Accessories', description: 'Double-wall vacuum insulation keeps drinks cold for 24 hours or hot for 12 hours.', price: 27.99, costPrice: 8.50, stock: 175, reorderLevel: 25, status: 'active' },
  { name: 'Full-Grain Leather Dress Belt with Automatic Buckle', sku: 'ACCS-BELT-005', category: 'Accessories', description: 'Ratchet mechanism allows precise micro-adjustments for perfect fit.', price: 39.99, costPrice: 13.00, stock: 85, reorderLevel: 15, status: 'active' },
  { name: 'Travel Cord Organizer & Electronic Accessories Pouch', sku: 'ACCS-CASE-006', category: 'Accessories', description: 'Multiple elastic loops and mesh pockets keep cables, chargers, and flash drives tidy.', price: 21.99, costPrice: 6.50, stock: 140, reorderLevel: 20, status: 'active' },
  { name: 'Minimalist Stainless Steel Slim Card Holder', sku: 'ACCS-CARD-007', category: 'Accessories', description: 'Holds up to 12 cards with integrated cash clip and RFID shielding.', price: 29.99, costPrice: 9.00, stock: 3, reorderLevel: 10, status: 'active' }, // Low stock
  { name: 'Unisex Knit Cashmere Beanie Hat', sku: 'ACCS-HAT-008', category: 'Accessories', description: 'Ultra-soft 100% cashmere yarn providing superior warmth without itchiness.', price: 35.00, costPrice: 12.00, stock: 45, reorderLevel: 10, status: 'active' },
  { name: 'Canvas & Leather Weekend Duffel Travel Bag', sku: 'ACCS-DUFF-009', category: 'Accessories', description: 'Spacious main compartment with separate shoe pocket and reinforced handles.', price: 89.99, costPrice: 32.00, stock: 25, reorderLevel: 5, status: 'active' },
  { name: 'Compact Automatic Windproof Travel Umbrella', sku: 'ACCS-UMB-010', category: 'Accessories', description: 'Teflon coated canopy with 9-rib wind-resilient frame and push-button open/close.', price: 24.99, costPrice: 7.50, stock: 95, reorderLevel: 15, status: 'active' },

  // Home & Kitchen (10 items)
  { name: 'Programmable Pour-Over Coffee Maker with Thermal Carafe', sku: 'HOME-COFF-001', category: 'Home & Kitchen', description: 'Precision showerhead design extracts optimal coffee flavor into a 10-cup thermal carafe.', price: 99.99, costPrice: 38.00, stock: 35, reorderLevel: 8, status: 'active' },
  { name: 'Non-Stick Cast Iron Dutch Oven 6-Quart Enameled', sku: 'HOME-COOK-002', category: 'Home & Kitchen', description: 'Heavyweight cast iron provides even heat distribution for braising, baking, and stewing.', price: 84.99, costPrice: 30.00, stock: 20, reorderLevel: 5, status: 'active' },
  { name: 'Smart Digital Food Scale with Macro Tracking App', sku: 'HOME-SCAL-003', category: 'Home & Kitchen', description: 'Measures down to 0.1g accuracy with Bluetooth connectivity to food logging apps.', price: 32.99, costPrice: 11.00, stock: 80, reorderLevel: 12, status: 'active' },
  { name: 'Ultra-Quiet HEPA Air Purifier for Large Rooms', sku: 'HOME-AIR-004', category: 'Home & Kitchen', description: '3-stage filtration captures 99.97% of dust, pollen, smoke, and pet dander.', price: 139.99, costPrice: 58.00, stock: 15, reorderLevel: 5, status: 'active' },
  { name: 'High-Speed Professional Countertop Blender 1500W', sku: 'HOME-BLEN-005', category: 'Home & Kitchen', description: 'Crushes ice and blends whole fruits into smooth soups and smoothies in seconds.', price: 119.99, costPrice: 48.00, stock: 2, reorderLevel: 8, status: 'active' }, // Low stock
  { name: 'Bamboo Wood Cutting Board Set with Juice Grooves', sku: 'HOME-CUT-006', category: 'Home & Kitchen', description: 'Set of 3 eco-friendly organic bamboo boards treated with food-grade mineral oil.', price: 29.99, costPrice: 9.00, stock: 105, reorderLevel: 15, status: 'active' },
  { name: 'Ergonomic Memory Foam Contour Neck Pillow', sku: 'HOME-PIL-007', category: 'Home & Kitchen', description: 'Cervical contour design supports head, neck, and shoulders for all sleeping positions.', price: 42.99, costPrice: 14.50, stock: 70, reorderLevel: 10, status: 'active' },
  { name: 'Stainless Steel Professional Chef Knife 8-Inch', sku: 'HOME-KNF-008', category: 'Home & Kitchen', description: 'High-carbon German steel blade with ergonomic full-tang triple-rivet handle.', price: 49.99, costPrice: 16.00, stock: 55, reorderLevel: 10, status: 'active' },
  { name: 'Ultrasonic Cool Mist Aroma Essential Oil Diffuser', sku: 'HOME-DIFF-009', category: 'Home & Kitchen', description: '500ml capacity with 7 ambient light modes and automatic safety shut-off.', price: 26.99, costPrice: 8.00, stock: 125, reorderLevel: 20, status: 'active' },
  { name: 'Reusable Food Storage Container Set 24-Piece', sku: 'HOME-BOX-010', category: 'Home & Kitchen', description: 'BPA-free leak-proof snap locking lids suitable for meal prep and freezer storage.', price: 34.99, costPrice: 11.50, stock: 90, reorderLevel: 15, status: 'active' },

  // Footwear (8 items)
  { name: 'Lightweight Road Running Shoes Cushion Sole', sku: 'FOOT-RUN-001', category: 'Footwear', description: 'Engineered mesh upper with responsive foam midsole for long distance comfort.', price: 89.99, costPrice: 35.00, stock: 40, reorderLevel: 10, status: 'active' },
  { name: 'Classic Leather Casual Low-Top Sneakers', sku: 'FOOT-SNEAK-002', category: 'Footwear', description: 'Minimalist white leather sneakers with padded collar and durable rubber cupsole.', price: 74.99, costPrice: 27.00, stock: 60, reorderLevel: 12, status: 'active' },
  { name: 'Waterproof Trail Hiking Boots High Ankle', sku: 'FOOT-HIKE-003', category: 'Footwear', description: 'Vibram high-traction lug outsole with breathable waterproof membrane.', price: 129.99, costPrice: 50.00, stock: 25, reorderLevel: 8, status: 'active' },
  { name: 'Slip-On Memory Foam Breathable Loafers', sku: 'FOOT-LOAF-004', category: 'Footwear', description: 'Stretch fabric upper with cushioned footbed for effortless daily wearing.', price: 54.99, costPrice: 19.00, stock: 70, reorderLevel: 10, status: 'active' },
  { name: 'Handcrafted Leather Chelsea Boots Classic Tan', sku: 'FOOT-BOOT-005', category: 'Footwear', description: 'Full-grain leather with elastic side goring and durable Goodyear welt construction.', price: 149.99, costPrice: 60.00, stock: 18, reorderLevel: 5, status: 'active' },
  { name: 'Supportive Arch Orthotic Recovery Sandals', sku: 'FOOT-SAND-006', category: 'Footwear', description: 'Deep heel cup and contoured arch support relieve plantarpasciitis strain.', price: 39.99, costPrice: 13.00, stock: 85, reorderLevel: 15, status: 'active' },
  { name: 'Breathable Knit Tennis Court Sport Shoes', sku: 'FOOT-TEN-007', category: 'Footwear', description: 'Reinforced toe cap and lateral support stability for aggressive court movements.', price: 94.99, costPrice: 36.00, stock: 30, reorderLevel: 8, status: 'active' },
  { name: 'Plush Fleece-Lined Indoor Outdoor House Slippers', sku: 'FOOT-SLIP-008', category: 'Footwear', description: 'Memory foam footbed with non-skid rubber sole suitable for indoors and patio.', price: 29.99, costPrice: 9.00, stock: 110, reorderLevel: 20, status: 'active' },
];

export const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin',
  'San Jose', 'San Francisco', 'Seattle', 'Denver', 'Boston',
  'Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Pune', 'London', 'Toronto',
];

export const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Neha', 'Aditya', 'Siddharth',
  'Elena', 'Mateo', 'Sophia', 'Lucas', 'Oliver', 'Emma', 'Liam', 'Ava',
];

export const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Rao', 'Kumar', 'Singh', 'Mehta',
  'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
];

export const REVIEW_TEMPLATES: SeedReviewTemplate[] = [
  {
    rating: 5,
    text: 'Exceeded all my expectations! Build quality is top-notch, delivery was prompt, and it works seamlessly right out of the box.',
    verifiedPurchase: true,
    aiAnalysis: {
      sentiment: 'positive',
      topics: ['build quality', 'fast delivery', 'usability'],
      summary: 'Customer expressed extreme satisfaction with build quality and seamless operation.',
      suggestedAction: 'Consider featuring this item in promotional banners.',
    },
  },
  {
    rating: 5,
    text: 'Fantastic product! High quality materials, very comfortable, and great value for money. Would definitely buy again.',
    verifiedPurchase: true,
    aiAnalysis: {
      sentiment: 'positive',
      topics: ['value for money', 'comfort', 'repeat purchase'],
      summary: 'High customer satisfaction regarding comfort and price-to-quality ratio.',
      suggestedAction: 'Maintain current pricing strategy.',
    },
  },
  {
    rating: 4,
    text: 'Really happy with this purchase overall. The product performs well, though packaging could be slightly sturdier.',
    verifiedPurchase: true,
    aiAnalysis: {
      sentiment: 'positive',
      topics: ['performance', 'packaging'],
      summary: 'Product performs well, minor feedback on packaging durability.',
      suggestedAction: 'Review fulfillment packaging supplier.',
    },
  },
  {
    rating: 4,
    text: 'Good solid product. Matches the online description accurately. Shipping took an extra day but worth the wait.',
    verifiedPurchase: true,
    aiAnalysis: {
      sentiment: 'positive',
      topics: ['accuracy', 'shipping duration'],
      summary: 'Accurate description and solid performance despite minor shipping delay.',
      suggestedAction: 'Monitor courier delivery timelines.',
    },
  },
  {
    rating: 3,
    text: 'Decent quality for the price point, but felt a bit average. Works fine for light everyday use.',
    verifiedPurchase: true,
    aiAnalysis: {
      sentiment: 'neutral',
      topics: ['average performance', 'price point'],
      summary: 'Product meets basic user expectations without standout features.',
      suggestedAction: 'Highlight premium features in product description.',
    },
  },
  {
    rating: 2,
    text: 'Disappointed with the durability. Worked great for the first week, but started showing wear sooner than expected.',
    verifiedPurchase: false,
    aiAnalysis: {
      sentiment: 'negative',
      topics: ['durability issue', 'early wear'],
      summary: 'Customer reported durability concerns shortly after purchase.',
      suggestedAction: 'Inspect QA batch quality control.',
    },
  },
  {
    rating: 1,
    text: 'Not worth the price. The item arrived with missing accessories and customer support took days to reply.',
    verifiedPurchase: true,
    aiAnalysis: {
      sentiment: 'negative',
      topics: ['missing accessories', 'slow customer support', 'overpriced'],
      summary: 'Severe dissatisfaction due to incomplete shipment and delayed support.',
      suggestedAction: 'Audit warehouse packing checklist and prioritize support ticket.',
    },
  },
];
