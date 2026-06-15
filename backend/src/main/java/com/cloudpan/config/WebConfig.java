package com.cloudpan.config;

import com.cloudpan.interceptor.AuthInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private AuthInterceptor authInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/login", "/api/auth/register", "/api/public/**", "/api/auth/avatar/*", "/api/auth/avatar/avatars/**", "/api/group/avatar/**", "/api/chat/file/**", "/api/chat/thumb/**", "/api/emoji/**", "/api/moments/file/**");
    }

    @Override
    public void addResourceHandlers(org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        // Map /api/emoji/** to file:uploads/emoji/
        // Note: cloudpan.storage.chat-path is "uploads", so we assume "uploads" is in the working directory.
        // We need to use absolute path or relative to working dir.
        // Let's use System.getProperty("user.dir") + "/uploads/emoji/" logic or just "file:uploads/emoji/"
        registry.addResourceHandler("/api/emoji/**")
                .addResourceLocations("file:uploads/emoji/");
        registry.addResourceHandler("/api/auth/avatar/avatars/**")
                .addResourceLocations("file:uploads/avatars/");
    }
}
