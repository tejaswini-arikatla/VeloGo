package com.velogo;

import com.velogo.exception.BadRequestException;
import com.velogo.exception.GlobalExceptionHandler;
import com.velogo.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import static org.junit.jupiter.api.Assertions.*;

public class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("Should return 404 with Not Found envelope on ResourceNotFoundException")
    void testHandleNotFound() {
        ResourceNotFoundException ex = new ResourceNotFoundException("User not found with id 123");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = handler.handleNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().status());
        assertEquals("Not Found", response.getBody().error());
        assertEquals("User not found with id 123", response.getBody().message());
        assertNotNull(response.getBody().timestamp());
    }

    @Test
    @DisplayName("Should return 400 on BadRequestException")
    void testHandleBadRequest() {
        BadRequestException ex = new BadRequestException("Invalid coordinate format");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = handler.handleBadRequest(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
        assertEquals("Bad Request", response.getBody().error());
        assertEquals("Invalid coordinate format", response.getBody().message());
    }

    @Test
    @DisplayName("Should return 400 on HttpMessageNotReadableException")
    void testHandleMessageNotReadable() {
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("JSON parse error");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = handler.handleMessageNotReadable(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
        assertEquals("Malformed Request", response.getBody().error());
        assertTrue(response.getBody().message().contains("Malformed JSON"));
    }

    @Test
    @DisplayName("Should return 400 on MissingServletRequestParameterException")
    void testHandleMissingParams() {
        MissingServletRequestParameterException ex = new MissingServletRequestParameterException("email", "String");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = handler.handleMissingParams(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Missing Parameter", response.getBody().error());
        assertTrue(response.getBody().message().contains("'email' is missing"));
    }

    @Test
    @DisplayName("Should return 500 on unexpected generic exception")
    void testHandleGeneric() {
        RuntimeException ex = new RuntimeException("Database connection timeout");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = handler.handleGeneric(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().status());
        assertEquals("Internal Server Error", response.getBody().error());
        assertEquals("Database connection timeout", response.getBody().message());
    }
}
