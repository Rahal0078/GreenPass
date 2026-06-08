export interface KeralaPlace {
  name: string;
  district: string;
  pincode: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

const KERALA_PLACES: KeralaPlace[] = [
  // ── Thiruvananthapuram ──────────────────────────────────────────────────────
  { name: "Thiruvananthapuram", district: "Thiruvananthapuram", pincode: "695001", address: "Thiruvananthapuram, Kerala", lat: 8.5241, lng: 76.9366 },
  { name: "Kazhakkoottam", district: "Thiruvananthapuram", pincode: "695582", address: "Kazhakkoottam, Thiruvananthapuram, Kerala", lat: 8.5631, lng: 76.8801 },
  { name: "Varkala", district: "Thiruvananthapuram", pincode: "695141", address: "Varkala, Thiruvananthapuram, Kerala", lat: 8.7379, lng: 76.7141 },
  { name: "Neyyattinkara", district: "Thiruvananthapuram", pincode: "695121", address: "Neyyattinkara, Thiruvananthapuram, Kerala", lat: 8.4006, lng: 77.0873 },
  { name: "Attingal", district: "Thiruvananthapuram", pincode: "695101", address: "Attingal, Thiruvananthapuram, Kerala", lat: 8.6971, lng: 76.8152 },
  { name: "Nedumangad", district: "Thiruvananthapuram", pincode: "695541", address: "Nedumangad, Thiruvananthapuram, Kerala", lat: 8.6029, lng: 77.0014 },
  { name: "Parassala", district: "Thiruvananthapuram", pincode: "695502", address: "Parassala, Thiruvananthapuram, Kerala", lat: 8.3664, lng: 77.1373 },
  { name: "Chirayinkeezhu", district: "Thiruvananthapuram", pincode: "695304", address: "Chirayinkeezhu, Thiruvananthapuram, Kerala", lat: 8.7803, lng: 76.7626 },
  { name: "Kattakada", district: "Thiruvananthapuram", pincode: "695572", address: "Kattakada, Thiruvananthapuram, Kerala", lat: 8.5544, lng: 77.0876 },
  { name: "Nemom", district: "Thiruvananthapuram", pincode: "695020", address: "Nemom, Thiruvananthapuram, Kerala", lat: 8.4842, lng: 76.9634 },
  { name: "Vattiyoorkavu", district: "Thiruvananthapuram", pincode: "695013", address: "Vattiyoorkavu, Thiruvananthapuram, Kerala", lat: 8.5683, lng: 76.9197 },
  { name: "Kovalam", district: "Thiruvananthapuram", pincode: "695527", address: "Kovalam, Thiruvananthapuram, Kerala", lat: 8.4004, lng: 76.9786 },
  { name: "Poovar", district: "Thiruvananthapuram", pincode: "695525", address: "Poovar, Thiruvananthapuram, Kerala", lat: 8.3148, lng: 77.0845 },
  { name: "Balaramapuram", district: "Thiruvananthapuram", pincode: "695501", address: "Balaramapuram, Thiruvananthapuram, Kerala", lat: 8.4326, lng: 77.0328 },

  // ── Kollam ──────────────────────────────────────────────────────────────────
  { name: "Kollam", district: "Kollam", pincode: "691001", address: "Kollam, Kerala", lat: 8.8932, lng: 76.6141 },
  { name: "Karunagappally", district: "Kollam", pincode: "690518", address: "Karunagappally, Kollam, Kerala", lat: 9.0319, lng: 76.5309 },
  { name: "Punalur", district: "Kollam", pincode: "691305", address: "Punalur, Kollam, Kerala", lat: 9.0096, lng: 76.9230 },
  { name: "Anchal", district: "Kollam", pincode: "691306", address: "Anchal, Kollam, Kerala", lat: 8.9719, lng: 76.8750 },
  { name: "Chavara", district: "Kollam", pincode: "691583", address: "Chavara, Kollam, Kerala", lat: 8.9999, lng: 76.5488 },
  { name: "Kundara", district: "Kollam", pincode: "691501", address: "Kundara, Kollam, Kerala", lat: 8.9766, lng: 76.6852 },
  { name: "Kottarakkara", district: "Kollam", pincode: "691506", address: "Kottarakkara, Kollam, Kerala", lat: 9.0024, lng: 76.7779 },
  { name: "Paravur", district: "Kollam", pincode: "691301", address: "Paravur, Kollam, Kerala", lat: 8.8001, lng: 76.6771 },
  { name: "Varkala", district: "Kollam", pincode: "695141", address: "Varkala, Kollam, Kerala", lat: 8.7379, lng: 76.7141 },
  { name: "Sasthamkotta", district: "Kollam", pincode: "690521", address: "Sasthamkotta, Kollam, Kerala", lat: 9.0249, lng: 76.6350 },
  { name: "Perinad", district: "Kollam", pincode: "691601", address: "Perinad, Kollam, Kerala", lat: 8.9342, lng: 76.6512 },
  { name: "Mynagappally", district: "Kollam", pincode: "690514", address: "Mynagappally, Kollam, Kerala", lat: 9.0767, lng: 76.4990 },

  // ── Pathanamthitta ──────────────────────────────────────────────────────────
  { name: "Pathanamthitta", district: "Pathanamthitta", pincode: "689645", address: "Pathanamthitta, Kerala", lat: 9.2648, lng: 76.7870 },
  { name: "Thiruvalla", district: "Pathanamthitta", pincode: "689101", address: "Thiruvalla, Pathanamthitta, Kerala", lat: 9.3834, lng: 76.5739 },
  { name: "Adoor", district: "Pathanamthitta", pincode: "691523", address: "Adoor, Pathanamthitta, Kerala", lat: 9.1551, lng: 76.7413 },
  { name: "Pandalam", district: "Pathanamthitta", pincode: "689501", address: "Pandalam, Pathanamthitta, Kerala", lat: 9.2182, lng: 76.6519 },
  { name: "Ranni", district: "Pathanamthitta", pincode: "689673", address: "Ranni, Pathanamthitta, Kerala", lat: 9.3847, lng: 76.7837 },
  { name: "Konni", district: "Pathanamthitta", pincode: "689691", address: "Konni, Pathanamthitta, Kerala", lat: 9.2347, lng: 76.8538 },
  { name: "Kozhencherry", district: "Pathanamthitta", pincode: "689641", address: "Kozhencherry, Pathanamthitta, Kerala", lat: 9.3203, lng: 76.7024 },
  { name: "Mallappally", district: "Pathanamthitta", pincode: "689585", address: "Mallappally, Pathanamthitta, Kerala", lat: 9.3261, lng: 76.5564 },

  // ── Alappuzha ───────────────────────────────────────────────────────────────
  { name: "Alappuzha", district: "Alappuzha", pincode: "688001", address: "Alappuzha (Alleppey), Kerala", lat: 9.4981, lng: 76.3388 },
  { name: "Cherthala", district: "Alappuzha", pincode: "688524", address: "Cherthala, Alappuzha, Kerala", lat: 9.6828, lng: 76.3389 },
  { name: "Mavelikkara", district: "Alappuzha", pincode: "690101", address: "Mavelikkara, Alappuzha, Kerala", lat: 9.2636, lng: 76.5534 },
  { name: "Kayamkulam", district: "Alappuzha", pincode: "690502", address: "Kayamkulam, Alappuzha, Kerala", lat: 9.1726, lng: 76.5020 },
  { name: "Haripad", district: "Alappuzha", pincode: "690514", address: "Haripad, Alappuzha, Kerala", lat: 9.2331, lng: 76.4762 },
  { name: "Chengannur", district: "Alappuzha", pincode: "689521", address: "Chengannur, Alappuzha, Kerala", lat: 9.3157, lng: 76.6155 },
  { name: "Ambalapuzha", district: "Alappuzha", pincode: "688561", address: "Ambalapuzha, Alappuzha, Kerala", lat: 9.4209, lng: 76.3507 },
  { name: "Mararikulam", district: "Alappuzha", pincode: "688535", address: "Mararikulam, Alappuzha, Kerala", lat: 9.5831, lng: 76.2954 },
  { name: "Kuttanad", district: "Alappuzha", pincode: "688501", address: "Kuttanad, Alappuzha, Kerala", lat: 9.4087, lng: 76.4348 },
  { name: "Mannar", district: "Alappuzha", pincode: "689622", address: "Mannar, Alappuzha, Kerala", lat: 9.2936, lng: 76.5083 },

  // ── Kottayam ────────────────────────────────────────────────────────────────
  { name: "Kottayam", district: "Kottayam", pincode: "686001", address: "Kottayam, Kerala", lat: 9.5916, lng: 76.5222 },
  { name: "Changanassery", district: "Kottayam", pincode: "686101", address: "Changanassery, Kottayam, Kerala", lat: 9.4428, lng: 76.5391 },
  { name: "Pala", district: "Kottayam", pincode: "686575", address: "Pala, Kottayam, Kerala", lat: 9.7101, lng: 76.6876 },
  { name: "Ettumanoor", district: "Kottayam", pincode: "686631", address: "Ettumanoor, Kottayam, Kerala", lat: 9.6759, lng: 76.5588 },
  { name: "Vaikom", district: "Kottayam", pincode: "686141", address: "Vaikom, Kottayam, Kerala", lat: 9.7512, lng: 76.3927 },
  { name: "Kanjirappally", district: "Kottayam", pincode: "686507", address: "Kanjirappally, Kottayam, Kerala", lat: 9.5533, lng: 76.7847 },
  { name: "Ponkunnam", district: "Kottayam", pincode: "686506", address: "Ponkunnam, Kottayam, Kerala", lat: 9.5830, lng: 76.7327 },
  { name: "Erattupetta", district: "Kottayam", pincode: "686121", address: "Erattupetta, Kottayam, Kerala", lat: 9.7141, lng: 76.7841 },
  { name: "Mundakayam", district: "Kottayam", pincode: "686513", address: "Mundakayam, Kottayam, Kerala", lat: 9.5145, lng: 76.8657 },
  { name: "Kumarakom", district: "Kottayam", pincode: "686563", address: "Kumarakom, Kottayam, Kerala", lat: 9.6175, lng: 76.4298 },

  // ── Idukki ──────────────────────────────────────────────────────────────────
  { name: "Idukki", district: "Idukki", pincode: "685602", address: "Idukki, Kerala", lat: 9.9149, lng: 77.1025 },
  { name: "Munnar", district: "Idukki", pincode: "685612", address: "Munnar, Idukki, Kerala", lat: 10.0889, lng: 77.0595 },
  { name: "Thodupuzha", district: "Idukki", pincode: "685584", address: "Thodupuzha, Idukki, Kerala", lat: 9.8936, lng: 76.7171 },
  { name: "Kattappana", district: "Idukki", pincode: "685515", address: "Kattappana, Idukki, Kerala", lat: 9.7508, lng: 77.1085 },
  { name: "Adimali", district: "Idukki", pincode: "685561", address: "Adimali, Idukki, Kerala", lat: 10.0067, lng: 76.9550 },
  { name: "Painavu", district: "Idukki", pincode: "685603", address: "Painavu, Idukki, Kerala", lat: 9.9272, lng: 77.0827 },
  { name: "Devikulam", district: "Idukki", pincode: "685613", address: "Devikulam, Idukki, Kerala", lat: 10.0522, lng: 77.1135 },
  { name: "Nedumkandam", district: "Idukki", pincode: "685553", address: "Nedumkandam, Idukki, Kerala", lat: 9.8575, lng: 77.0986 },

  // ── Ernakulam ───────────────────────────────────────────────────────────────
  { name: "Ernakulam", district: "Ernakulam", pincode: "682001", address: "Ernakulam, Kerala", lat: 9.9816, lng: 76.2999 },
  { name: "Kochi", district: "Ernakulam", pincode: "682011", address: "Kochi, Ernakulam, Kerala", lat: 9.9312, lng: 76.2673 },
  { name: "Aluva", district: "Ernakulam", pincode: "683101", address: "Aluva, Ernakulam, Kerala", lat: 10.1005, lng: 76.3572 },
  { name: "Angamaly", district: "Ernakulam", pincode: "683573", address: "Angamaly, Ernakulam, Kerala", lat: 10.1952, lng: 76.3862 },
  { name: "Perumbavoor", district: "Ernakulam", pincode: "683542", address: "Perumbavoor, Ernakulam, Kerala", lat: 10.1079, lng: 76.4800 },
  { name: "Muvattupuzha", district: "Ernakulam", pincode: "686661", address: "Muvattupuzha, Ernakulam, Kerala", lat: 9.9885, lng: 76.5791 },
  { name: "Kothamangalam", district: "Ernakulam", pincode: "686691", address: "Kothamangalam, Ernakulam, Kerala", lat: 10.0596, lng: 76.6342 },
  { name: "Thrippunithura", district: "Ernakulam", pincode: "682301", address: "Thrippunithura, Ernakulam, Kerala", lat: 9.9453, lng: 76.3516 },
  { name: "Kalamassery", district: "Ernakulam", pincode: "683104", address: "Kalamassery, Ernakulam, Kerala", lat: 10.0519, lng: 76.3182 },
  { name: "Kakkanad", district: "Ernakulam", pincode: "682030", address: "Kakkanad, Ernakulam, Kerala", lat: 10.0209, lng: 76.3499 },
  { name: "Edapally", district: "Ernakulam", pincode: "682024", address: "Edapally, Ernakulam, Kerala", lat: 10.0113, lng: 76.3100 },
  { name: "Piravom", district: "Ernakulam", pincode: "686664", address: "Piravom, Ernakulam, Kerala", lat: 9.8711, lng: 76.5162 },
  { name: "North Paravur", district: "Ernakulam", pincode: "683513", address: "North Paravur, Ernakulam, Kerala", lat: 10.1578, lng: 76.2173 },
  { name: "Cheranalloor", district: "Ernakulam", pincode: "682034", address: "Cheranalloor, Ernakulam, Kerala", lat: 9.9960, lng: 76.3740 },
  { name: "Thriprayar", district: "Thrissur", pincode: "680566", address: "Thriprayar, Thrissur, Kerala", lat: 10.4028, lng: 76.1419 },

  // ── Thrissur ────────────────────────────────────────────────────────────────
  { name: "Thrissur", district: "Thrissur", pincode: "680001", address: "Thrissur, Kerala", lat: 10.5276, lng: 76.2144 },
  { name: "Irinjalakuda", district: "Thrissur", pincode: "680121", address: "Irinjalakuda, Thrissur, Kerala", lat: 10.3414, lng: 76.2131 },
  { name: "Chalakudy", district: "Thrissur", pincode: "680307", address: "Chalakudy, Thrissur, Kerala", lat: 10.3027, lng: 76.3329 },
  { name: "Guruvayur", district: "Thrissur", pincode: "680101", address: "Guruvayur, Thrissur, Kerala", lat: 10.5949, lng: 76.0415 },
  { name: "Kodungallur", district: "Thrissur", pincode: "680664", address: "Kodungallur, Thrissur, Kerala", lat: 10.2340, lng: 76.1960 },
  { name: "Kunnamkulam", district: "Thrissur", pincode: "680503", address: "Kunnamkulam, Thrissur, Kerala", lat: 10.6481, lng: 76.0696 },
  { name: "Chavakkad", district: "Thrissur", pincode: "680506", address: "Chavakkad, Thrissur, Kerala", lat: 10.5898, lng: 76.0028 },
  { name: "Perinthalmanna", district: "Malappuram", pincode: "679322", address: "Perinthalmanna, Malappuram, Kerala", lat: 10.9759, lng: 76.2272 },
  { name: "Wadakkanchery", district: "Thrissur", pincode: "680623", address: "Wadakkanchery, Thrissur, Kerala", lat: 10.6543, lng: 76.2179 },
  { name: "Mala", district: "Thrissur", pincode: "680732", address: "Mala, Thrissur, Kerala", lat: 10.5040, lng: 76.2803 },
  { name: "Ollur", district: "Thrissur", pincode: "680306", address: "Ollur, Thrissur, Kerala", lat: 10.4686, lng: 76.2352 },
  { name: "Cherpu", district: "Thrissur", pincode: "680561", address: "Cherpu, Thrissur, Kerala", lat: 10.4612, lng: 76.1706 },
  { name: "Anthikkad", district: "Thrissur", pincode: "680641", address: "Anthikkad, Thrissur, Kerala", lat: 10.5636, lng: 76.2494 },

  // ── Palakkad ────────────────────────────────────────────────────────────────
  { name: "Palakkad", district: "Palakkad", pincode: "678001", address: "Palakkad, Kerala", lat: 10.7867, lng: 76.6548 },
  { name: "Ottapalam", district: "Palakkad", pincode: "679101", address: "Ottapalam, Palakkad, Kerala", lat: 10.7715, lng: 76.3796 },
  { name: "Shoranur", district: "Palakkad", pincode: "679121", address: "Shoranur, Palakkad, Kerala", lat: 10.7687, lng: 76.2719 },
  { name: "Mannarkkad", district: "Palakkad", pincode: "678582", address: "Mannarkkad, Palakkad, Kerala", lat: 10.9929, lng: 76.4696 },
  { name: "Pattambi", district: "Palakkad", pincode: "679303", address: "Pattambi, Palakkad, Kerala", lat: 10.8004, lng: 76.1961 },
  { name: "Alathur", district: "Palakkad", pincode: "678541", address: "Alathur, Palakkad, Kerala", lat: 10.6565, lng: 76.5450 },
  { name: "Cherpulassery", district: "Palakkad", pincode: "679503", address: "Cherpulassery, Palakkad, Kerala", lat: 10.8816, lng: 76.3095 },
  { name: "Shornur", district: "Palakkad", pincode: "679121", address: "Shornur, Palakkad, Kerala", lat: 10.7680, lng: 76.2760 },
  { name: "Chittur", district: "Palakkad", pincode: "678101", address: "Chittur, Palakkad, Kerala", lat: 10.6892, lng: 76.7449 },
  { name: "Malampuzha", district: "Palakkad", pincode: "678651", address: "Malampuzha, Palakkad, Kerala", lat: 10.8468, lng: 76.6907 },
  { name: "Thrithala", district: "Palakkad", pincode: "679531", address: "Thrithala, Palakkad, Kerala", lat: 10.8726, lng: 76.2403 },

  // ── Malappuram ──────────────────────────────────────────────────────────────
  { name: "Malappuram", district: "Malappuram", pincode: "676505", address: "Malappuram, Kerala", lat: 11.0730, lng: 76.0740 },
  { name: "Manjeri", district: "Malappuram", pincode: "676121", address: "Manjeri, Malappuram, Kerala", lat: 11.1200, lng: 76.1210 },
  { name: "Tirur", district: "Malappuram", pincode: "676101", address: "Tirur, Malappuram, Kerala", lat: 10.9131, lng: 75.9227 },
  { name: "Kondotty", district: "Malappuram", pincode: "673638", address: "Kondotty, Malappuram, Kerala", lat: 11.1230, lng: 75.9570 },
  { name: "Kottakkal", district: "Malappuram", pincode: "676501", address: "Kottakkal, Malappuram, Kerala", lat: 11.0017, lng: 76.0045 },
  { name: "Nilambur", district: "Malappuram", pincode: "679329", address: "Nilambur, Malappuram, Kerala", lat: 11.2795, lng: 76.2325 },
  { name: "Parappanangadi", district: "Malappuram", pincode: "676303", address: "Parappanangadi, Malappuram, Kerala", lat: 10.9617, lng: 75.8415 },
  { name: "Tanur", district: "Malappuram", pincode: "676302", address: "Tanur, Malappuram, Kerala", lat: 10.9893, lng: 75.8626 },
  { name: "Valanchery", district: "Malappuram", pincode: "676552", address: "Valanchery, Malappuram, Kerala", lat: 10.8722, lng: 76.0690 },
  { name: "Areekode", district: "Malappuram", pincode: "673639", address: "Areekode, Malappuram, Kerala", lat: 11.2136, lng: 75.9889 },
  { name: "Wandoor", district: "Malappuram", pincode: "679328", address: "Wandoor, Malappuram, Kerala", lat: 11.0001, lng: 76.2613 },
  { name: "Edappal", district: "Malappuram", pincode: "679576", address: "Edappal, Malappuram, Kerala", lat: 10.8252, lng: 75.9891 },
  { name: "Vengara", district: "Malappuram", pincode: "676304", address: "Vengara, Malappuram, Kerala", lat: 11.0186, lng: 75.9035 },
  { name: "Pandikkad", district: "Malappuram", pincode: "676521", address: "Pandikkad, Malappuram, Kerala", lat: 11.1460, lng: 76.1873 },
  { name: "Kalikavu", district: "Malappuram", pincode: "679340", address: "Kalikavu, Malappuram, Kerala", lat: 11.2015, lng: 76.3510 },
  { name: "Mankada", district: "Malappuram", pincode: "679324", address: "Mankada, Malappuram, Kerala", lat: 10.9985, lng: 76.2095 },
  { name: "Ponnani", district: "Malappuram", pincode: "679577", address: "Ponnani, Malappuram, Kerala", lat: 10.7740, lng: 75.9242 },
  { name: "Pulikkal", district: "Malappuram", pincode: "673637", address: "Pulikkal, Malappuram, Kerala", lat: 11.1700, lng: 75.9780 },
  { name: "Chelembra", district: "Malappuram", pincode: "673634", address: "Chelembra, Malappuram, Kerala", lat: 11.2215, lng: 75.9346 },
  { name: "Tiruvali", district: "Malappuram", pincode: "676302", address: "Tiruvali, Malappuram, Kerala", lat: 11.0061, lng: 75.8754 },
  { name: "Kalpakanchery", district: "Malappuram", pincode: "676552", address: "Kalpakanchery, Malappuram, Kerala", lat: 10.8901, lng: 76.0422 },
  { name: "Maranchery", district: "Malappuram", pincode: "676123", address: "Maranchery, Malappuram, Kerala", lat: 11.0904, lng: 76.0975 },
  { name: "Vettom", district: "Malappuram", pincode: "676103", address: "Vettom, Malappuram, Kerala", lat: 10.9360, lng: 75.9520 },
  { name: "Melmuri", district: "Malappuram", pincode: "676517", address: "Melmuri, Malappuram, Kerala", lat: 11.0618, lng: 76.0320 },
  { name: "Perintalmanna", district: "Malappuram", pincode: "679322", address: "Perintalmanna, Malappuram, Kerala", lat: 10.9830, lng: 76.2290 },
  { name: "Calicut Road", district: "Malappuram", pincode: "676505", address: "Calicut Road, Malappuram, Kerala", lat: 11.0690, lng: 76.0800 },

  // ── Kozhikode ───────────────────────────────────────────────────────────────
  { name: "Kozhikode", district: "Kozhikode", pincode: "673001", address: "Kozhikode (Calicut), Kerala", lat: 11.2588, lng: 75.7804 },
  { name: "Vadakara", district: "Kozhikode", pincode: "673101", address: "Vadakara, Kozhikode, Kerala", lat: 11.5981, lng: 75.5840 },
  { name: "Koyilandy", district: "Kozhikode", pincode: "673305", address: "Koyilandy, Kozhikode, Kerala", lat: 11.4412, lng: 75.7045 },
  { name: "Ramanattukara", district: "Kozhikode", pincode: "673633", address: "Ramanattukara, Kozhikode, Kerala", lat: 11.1854, lng: 75.8073 },
  { name: "Feroke", district: "Kozhikode", pincode: "673631", address: "Feroke, Kozhikode, Kerala", lat: 11.1635, lng: 75.8288 },
  { name: "Beypore", district: "Kozhikode", pincode: "673015", address: "Beypore, Kozhikode, Kerala", lat: 11.1724, lng: 75.8109 },
  { name: "Koduvally", district: "Kozhikode", pincode: "673572", address: "Koduvally, Kozhikode, Kerala", lat: 11.3536, lng: 75.9066 },
  { name: "Kunnamangalam", district: "Kozhikode", pincode: "673571", address: "Kunnamangalam, Kozhikode, Kerala", lat: 11.3203, lng: 75.8690 },
  { name: "Perambra", district: "Kozhikode", pincode: "673525", address: "Perambra, Kozhikode, Kerala", lat: 11.4639, lng: 75.7988 },
  { name: "Quilandy", district: "Kozhikode", pincode: "673305", address: "Quilandy, Kozhikode, Kerala", lat: 11.4412, lng: 75.7045 },
  { name: "Thamarassery", district: "Kozhikode", pincode: "673573", address: "Thamarassery, Kozhikode, Kerala", lat: 11.4258, lng: 75.9299 },
  { name: "Balussery", district: "Kozhikode", pincode: "673612", address: "Balussery, Kozhikode, Kerala", lat: 11.3849, lng: 75.8429 },
  { name: "Chelannur", district: "Kozhikode", pincode: "673616", address: "Chelannur, Kozhikode, Kerala", lat: 11.3026, lng: 75.9195 },

  // ── Wayanad ─────────────────────────────────────────────────────────────────
  { name: "Wayanad", district: "Wayanad", pincode: "673121", address: "Wayanad, Kerala", lat: 11.6854, lng: 76.1320 },
  { name: "Kalpetta", district: "Wayanad", pincode: "673121", address: "Kalpetta, Wayanad, Kerala", lat: 11.6079, lng: 76.0821 },
  { name: "Mananthavady", district: "Wayanad", pincode: "670645", address: "Mananthavady, Wayanad, Kerala", lat: 11.8007, lng: 76.0030 },
  { name: "Sultan Bathery", district: "Wayanad", pincode: "673592", address: "Sultan Bathery, Wayanad, Kerala", lat: 11.6625, lng: 76.2523 },
  { name: "Vythiri", district: "Wayanad", pincode: "673576", address: "Vythiri, Wayanad, Kerala", lat: 11.5740, lng: 76.0200 },
  { name: "Ambalavayal", district: "Wayanad", pincode: "673593", address: "Ambalavayal, Wayanad, Kerala", lat: 11.7468, lng: 76.1963 },
  { name: "Panamaram", district: "Wayanad", pincode: "670721", address: "Panamaram, Wayanad, Kerala", lat: 11.8466, lng: 76.1038 },
  { name: "Pulpally", district: "Wayanad", pincode: "673579", address: "Pulpally, Wayanad, Kerala", lat: 11.6523, lng: 76.1908 },
  { name: "Bathery", district: "Wayanad", pincode: "673592", address: "Bathery, Wayanad, Kerala", lat: 11.6625, lng: 76.2523 },

  // ── Kannur ──────────────────────────────────────────────────────────────────
  { name: "Kannur", district: "Kannur", pincode: "670001", address: "Kannur (Cannanore), Kerala", lat: 11.8745, lng: 75.3704 },
  { name: "Thalassery", district: "Kannur", pincode: "670101", address: "Thalassery, Kannur, Kerala", lat: 11.7483, lng: 75.4910 },
  { name: "Payyanur", district: "Kannur", pincode: "670307", address: "Payyanur, Kannur, Kerala", lat: 12.0986, lng: 75.2013 },
  { name: "Iritty", district: "Kannur", pincode: "670703", address: "Iritty, Kannur, Kerala", lat: 11.9921, lng: 75.6414 },
  { name: "Kuthuparamba", district: "Kannur", pincode: "670643", address: "Kuthuparamba, Kannur, Kerala", lat: 11.9182, lng: 75.5497 },
  { name: "Mattannur", district: "Kannur", pincode: "670702", address: "Mattannur, Kannur, Kerala", lat: 11.9326, lng: 75.5769 },
  { name: "Taliparamba", district: "Kannur", pincode: "670141", address: "Taliparamba, Kannur, Kerala", lat: 12.0367, lng: 75.3608 },
  { name: "Payyannur", district: "Kannur", pincode: "670307", address: "Payyannur, Kannur, Kerala", lat: 12.0986, lng: 75.2013 },
  { name: "Alakode", district: "Kannur", pincode: "670571", address: "Alakode, Kannur, Kerala", lat: 12.1437, lng: 75.3778 },
  { name: "Anthur", district: "Kannur", pincode: "670706", address: "Anthur, Kannur, Kerala", lat: 11.9673, lng: 75.5206 },
  { name: "Peravoor", district: "Kannur", pincode: "670673", address: "Peravoor, Kannur, Kerala", lat: 11.9869, lng: 75.6850 },
  { name: "Sreekandapuram", district: "Kannur", pincode: "670631", address: "Sreekandapuram, Kannur, Kerala", lat: 11.9703, lng: 75.4397 },

  // ── Kasaragod ───────────────────────────────────────────────────────────────
  { name: "Kasaragod", district: "Kasaragod", pincode: "671121", address: "Kasaragod, Kerala", lat: 12.4996, lng: 74.9869 },
  { name: "Kanhangad", district: "Kasaragod", pincode: "671315", address: "Kanhangad, Kasaragod, Kerala", lat: 12.3143, lng: 75.0944 },
  { name: "Nileshwar", district: "Kasaragod", pincode: "671314", address: "Nileshwar, Kasaragod, Kerala", lat: 12.2536, lng: 75.1300 },
  { name: "Hosdurg", district: "Kasaragod", pincode: "671316", address: "Hosdurg, Kasaragod, Kerala", lat: 12.3490, lng: 75.0760 },
  { name: "Udma", district: "Kasaragod", pincode: "671319", address: "Udma, Kasaragod, Kerala", lat: 12.4205, lng: 74.9905 },
  { name: "Bekal", district: "Kasaragod", pincode: "671318", address: "Bekal, Kasaragod, Kerala", lat: 12.3892, lng: 75.0327 },
  { name: "Cheruvathur", district: "Kasaragod", pincode: "671313", address: "Cheruvathur, Kasaragod, Kerala", lat: 12.2168, lng: 75.1685 },
  { name: "Manjeshwar", district: "Kasaragod", pincode: "671323", address: "Manjeshwar, Kasaragod, Kerala", lat: 12.7167, lng: 74.8869 },
  { name: "Uppala", district: "Kasaragod", pincode: "671322", address: "Uppala, Kasaragod, Kerala", lat: 12.5848, lng: 74.9388 },
  { name: "Kumbla", district: "Kasaragod", pincode: "671321", address: "Kumbla, Kasaragod, Kerala", lat: 12.6304, lng: 74.9193 },
  { name: "Perla", district: "Kasaragod", pincode: "671552", address: "Perla, Kasaragod, Kerala", lat: 12.5452, lng: 75.1044 },
  { name: "Vorkady", district: "Kasaragod", pincode: "671124", address: "Vorkady, Kasaragod, Kerala", lat: 12.4767, lng: 75.0256 },
];

export function searchPlaces(query: string): KeralaPlace[] {
  if (!query || query.trim().length === 0) {
    return KERALA_PLACES.slice(0, 50);
  }
  const q = query.toLowerCase().trim();
  const exact: KeralaPlace[] = [];
  const starts: KeralaPlace[] = [];
  const contains: KeralaPlace[] = [];

  for (const p of KERALA_PLACES) {
    const nameLower = p.name.toLowerCase();
    const districtLower = p.district.toLowerCase();
    if (nameLower === q) {
      exact.push(p);
    } else if (nameLower.startsWith(q)) {
      starts.push(p);
    } else if (
      nameLower.includes(q) ||
      districtLower.includes(q) ||
      p.pincode.includes(q) ||
      p.address.toLowerCase().includes(q)
    ) {
      contains.push(p);
    }
  }

  return [...exact, ...starts, ...contains].slice(0, 20);
}
