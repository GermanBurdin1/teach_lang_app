import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StructuredDataService {

  constructor() { }

  /**
   * Generate Organization structured data
   */
  generateOrganizationSchema(): any {
    return {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "LINGUACONNECT",
      "description": "Online French language learning platform specializing in DELF and DALF exam preparation",
      "url": "https://linguaconnect.com",
      "logo": "https://linguaconnect.com/assets/images/logo.png",
      "sameAs": [
        "https://www.facebook.com/linguaconnect",
        "https://www.twitter.com/linguaconnect",
        "https://www.linkedin.com/company/linguaconnect"
      ],
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "FR",
        "addressLocality": "Paris"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+33-1-23-45-67-89",
        "contactType": "customer service",
        "availableLanguage": ["English", "French", "Spanish", "German"]
      },
      "offers": {
        "@type": "Offer",
        "description": "French language courses for DELF and DALF preparation",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    };
  }

  /**
   * Generate Course structured data
   */
  generateCourseSchema(courseData: any): any {
    return {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": courseData.title || "French DELF/DALF Preparation Course",
      "description": courseData.description || "Comprehensive French language course for DELF and DALF exam preparation",
      "provider": {
        "@type": "EducationalOrganization",
        "name": "LINGUACONNECT",
        "url": "https://linguaconnect.com"
      },
      "courseMode": "online",
      "educationalLevel": courseData.level || "Intermediate",
      "inLanguage": "fr",
      "teaches": [
        "French language",
        "DELF preparation",
        "DALF preparation",
        "French grammar",
        "French vocabulary",
        "French conversation"
      ],
      "offers": {
        "@type": "Offer",
        "price": courseData.price || "99",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "validFrom": new Date().toISOString()
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "150"
      }
    };
  }

  /**
   * Generate Person structured data for teachers
   */
  generateTeacherSchema(teacherData: any): any {
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": teacherData.name,
      "jobTitle": "French Language Teacher",
      "worksFor": {
        "@type": "EducationalOrganization",
        "name": "LINGUACONNECT"
      },
      "knowsAbout": [
        "French language",
        "DELF preparation",
        "DALF preparation",
        "French grammar",
        "French literature"
      ],
      "hasCredential": {
        "@type": "EducationalOccupationalCredential",
        "name": teacherData.qualification || "French Language Teaching Certificate"
      },
      "alumniOf": teacherData.university || "Sorbonne University",
      "description": teacherData.bio || "Experienced French language teacher specializing in DELF and DALF exam preparation"
    };
  }

  /**
   * Generate Review structured data
   */
  generateReviewSchema(reviewData: any): any {
    return {
      "@context": "https://schema.org",
      "@type": "Review",
      "itemReviewed": {
        "@type": "Course",
        "name": "French DELF/DALF Preparation Course"
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": reviewData.rating,
        "bestRating": "5"
      },
      "author": {
        "@type": "Person",
        "name": reviewData.authorName
      },
      "reviewBody": reviewData.comment,
      "datePublished": reviewData.date
    };
  }

  /**
   * Generate FAQ structured data
   */
  generateFAQSchema(faqData: any[]): any {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }

  /**
   * Generate Breadcrumb structured data
   */
  generateBreadcrumbSchema(breadcrumbs: any[]): any {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": crumb.url
      }))
    };
  }

  /**
   * Inject structured data into page head
   */
  injectStructuredData(data: any): void {
    // Remove existing structured data
    const existingScript = document.getElementById('structured-data');
    if (existingScript) {
      existingScript.remove();
    }

    // Create new script tag
    const script = document.createElement('script');
    script.id = 'structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    console.log('📊 Structured data injected:', data);
  }

  /**
   * Generate comprehensive page structured data
   */
  generatePageStructuredData(pageType: string, data: any): any {
    const baseData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": data.title || "LINGUACONNECT - French Language Learning",
      "description": data.description || "Learn French with LINGUACONNECT",
      "url": data.url || window.location.href,
      "isPartOf": {
        "@type": "WebSite",
        "name": "LINGUACONNECT",
        "url": "https://linguaconnect.com"
      },
      "publisher": {
        "@type": "EducationalOrganization",
        "name": "LINGUACONNECT"
      }
    };

    switch (pageType) {
      case 'course':
        return { ...baseData, ...this.generateCourseSchema(data) };
      case 'teacher':
        return { ...baseData, ...this.generateTeacherSchema(data) };
      case 'homepage':
        return { ...baseData, ...this.generateOrganizationSchema() };
      default:
        return baseData;
    }
  }
}
