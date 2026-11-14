# TalentPulse — Enterprise HR Management Portal (`hr-management-portal`)

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.x-green.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1.svg)](https://www.mysql.com/)

A modern, enterprise-grade full-stack HR and Recruitment Management application. TalentPulse streamlines **Manpower Requisitions, Multi-Tier Approval Workflows, Candidate Authenticity Verification, System User Interview Scheduling, Smart Evaluation Focus Criteria Autocomplete, and 30-Day TAT (Turn-Around-Time) SLA Tracking**.

---

## 🏛️ Architecture & Technology Stack

| Layer | Technologies | Responsibilities |
|---|---|---|
| **Backend** | **Java 21**, **Spring Boot 3.3.x**, **Maven** | Enterprise REST APIs, business validation rules, approval workflow engine, TAT SLA calculators, Apache PDFBox resume extraction, Flyway migrations. |
| **Security** | **Spring Security 6**, **JWT (jjwt 0.12.x)**, **BCrypt** | Role-Based Access Control (RBAC), multi-tier administrative permissions, password resets, stateless authentication. |
| **Database** | **MySQL 8.x**, **Flyway Migrations** | Normalized relational database schema with versioned migrations (`V1` through `V16`), indexes, foreign keys, and audit views. |
| **Frontend** | **React.js 18**, **Vite**, **Bootstrap 5**, **Bootstrap Icons** | Modern enterprise responsive UI, candidate verification, smart evaluation criteria autocomplete, approval matrix, SLA meters. |

---

## 📁 Repository Directory Structure

```text
hr-management-portal/
├── run_all.bat                           <-- Quick launcher: boots both Backend & Frontend
├── run_backend.bat                       <-- Quick launcher for Spring Boot backend
├── run_frontend.bat                      <-- Quick launcher for React Vite frontend
├── push_to_github.bat                    <-- Push to GitHub script
├── Dockerfile                            <-- Multi-stage Docker build for deployment
├── hr-management-portal/
│   ├── preview.html                      <-- Standalone zero-dependency interactive portal preview
│   ├── README.md
│   ├── frontend/
│   │   ├── package.json                  <-- Vite + React 18 + Bootstrap 5
│   │   ├── vite.config.js
│   │   └── src/
│   │       ├── App.jsx                   <-- Application root & navigation
│   │       ├── components/               <-- Modals, views, smart autocomplete, candidate profile
│   │       ├── services/api.js           <-- Centralized REST API client
│   │       └── styles/                   <-- Enterprise theme CSS
│   ├── backend/
│   │   ├── pom.xml                       <-- Maven build (Spring Boot 3.3.4, Java 21, Security, Flyway, PDFBox)
│   │   └── src/main/
│   │       ├── java/com/company/hr/      <-- Controllers, Services, Repositories, Entities, DTOs
│   │       └── resources/
│   │           ├── application.yml       <-- DB configs, JWT, SMTP, TAT settings
│   │           └── db/migration/         <-- Flyway SQL migrations (V1 to V16)
│   └── database/
│       └── migrations/                   <-- SQL DDL and seed scripts
```

---

## 👥 Roles & Permissions Matrix

- **IT Admin** (`ROLE_IT_ADMIN`): Full superuser access, system user accounts, database maintenance.
- **HR Admin** (`ROLE_HR_ADMIN`): Requisition vetting, recruiter assignment, interview scheduling & evaluator assignment, candidate verification.
- **HR Recruiter** (`ROLE_HR_RECRUITER`): Candidate sourcing, requisition pipeline, 30-day TAT tracking.
- **Department Head** (`ROLE_DEPT_HEAD`): Departmental requisitions, first-line approvals.
- **Approving Manager** (`ROLE_APPROVING_MANAGER`): Review, approve, reject with justification, or return for correction.
- **Senior Management** (`ROLE_SENIOR_MGMT`): Executive signoff and strategic headcount expansion.
- **Interviewer** (`ROLE_INTERVIEWER`): Assigned interview panel calendar, evaluation criteria scorecards, and ratings.
- **Employee / Requester** (`ROLE_EMPLOYEE`): Employee profile, document access, internal requisitions.

---

## 🚀 Quick Start Guide

### 1. One-Click Launch (Windows)
Double-click `run_all.bat` at the repository root to start both backend and frontend servers automatically.

### 2. Manual Setup

#### Backend (Spring Boot & Java 21)
```bash
cd hr-management-portal/backend
mvn clean install
mvn spring-boot:run
# Backend REST APIs start on http://localhost:8080
```

#### Frontend (React 18 & Vite)
```bash
cd hr-management-portal/frontend
npm install
npm run dev
# Frontend application starts on http://localhost:5173
```

---

## 🔗 Repository Information
- **Project**: TalentPulse HR Management Portal (`hr-management-portal`)
- **GitHub**: [https://github.com/Ajay-Bhor/hr-management-portal](https://github.com/Ajay-Bhor/hr-management-portal)
