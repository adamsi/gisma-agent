package iaf.ofek.sigma.ai.service.auth;

import iaf.ofek.sigma.ai.exception.EmailSendingException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final String IMAGE_PATH = "static/images/legal-copilot.png";

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendEmail(String toEmail, String subject, String content) {
        try {
            MimeMessage mail = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mail, true);
            helper.setTo(toEmail);
            helper.setFrom(fromEmail);
            helper.setSubject(subject);
            helper.setText(content, true);
            ClassPathResource imageResource = new ClassPathResource(IMAGE_PATH);
            helper.addAttachment("static/images/legal-copilot.png", imageResource);
            mailSender.send(mail);
        } catch (MessagingException e) {
            throw new EmailSendingException("Failed to send email: " + e.getMessage());
        }
    }
}
