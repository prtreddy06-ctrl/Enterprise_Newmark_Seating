import React, { useState } from "react";
import { 
  Database, 
  Terminal, 
  Settings, 
  ShieldAlert, 
  FileCode, 
  Activity, 
  CheckCircle,
  Copy,
  FolderOpen
} from "lucide-react";

export default function DeveloperFiles() {
  const [activeTab, setActiveTab] = useState<"sql" | "ef" | "docker" | "cicd" | "tests">("sql");
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sqlScripts = `-- =========================================================
-- DATABASE: Microsoft SQL Server / Azure SQL Database
-- MODULE: Enterprise Seating Management System (20k+ Employees)
-- AUTHOR: Senior Enterprise Software Architect
-- =========================================================

CREATE DATABASE CorporateSeatingDB;
GO
USE CorporateSeatingDB;
GO

-- 1. Buildings Table
CREATE TABLE Buildings (
    Id NVARCHAR(50) PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    Location NVARCHAR(150) NOT NULL,
    FloorsCount INT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);

-- 2. Floors Table
CREATE TABLE Floors (
    Id NVARCHAR(50) PRIMARY KEY,
    BuildingId NVARCHAR(50) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Capacity INT NOT NULL,
    ZonesCount INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Floors_Buildings FOREIGN KEY (BuildingId) REFERENCES Buildings(Id) ON DELETE CASCADE
);

-- 3. Zones Table
CREATE TABLE Zones (
    Id NVARCHAR(50) PRIMARY KEY,
    FloorId NVARCHAR(50) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Department NVARCHAR(100) NOT NULL,
    Color NVARCHAR(20) NOT NULL,
    X INT NOT NULL DEFAULT 0,
    Y INT NOT NULL DEFAULT 0,
    Width INT NOT NULL DEFAULT 150,
    Height INT NOT NULL DEFAULT 120,
    Capacity INT NOT NULL,
    CONSTRAINT FK_Zones_Floors FOREIGN KEY (FloorId) REFERENCES Floors(Id) ON DELETE CASCADE
);

-- 4. Seats Table
CREATE TABLE Seats (
    Id NVARCHAR(50) PRIMARY KEY,
    SeatNumber NVARCHAR(50) NOT NULL,
    ZoneId NVARCHAR(50) NULL,
    FloorId NVARCHAR(50) NOT NULL,
    BuildingId NVARCHAR(50) NOT NULL,
    Type NVARCHAR(50) NOT NULL, -- Standard, Hot Desk, Executive, Collaborative
    Status NVARCHAR(50) NOT NULL DEFAULT 'Vacant', -- Vacant, Occupied, Reserved
    EmployeeId NVARCHAR(50) NULL,
    EmployeeName NVARCHAR(150) NULL,
    EmployeeEmail NVARCHAR(150) NULL,
    Department NVARCHAR(100) NULL,
    X INT NOT NULL DEFAULT 0,
    Y INT NOT NULL DEFAULT 0,
    Rotation INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Seats_Zones FOREIGN KEY (ZoneId) REFERENCES Zones(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Seats_Floors FOREIGN KEY (FloorId) REFERENCES Floors(Id),
    CONSTRAINT FK_Seats_Buildings FOREIGN KEY (BuildingId) REFERENCES Buildings(Id)
);

-- 5. IT Assets Table
CREATE TABLE ITAssets (
    Id NVARCHAR(50) PRIMARY KEY,
    SeatId NVARCHAR(50) NULL,
    Type NVARCHAR(50) NOT NULL, -- Laptop, Monitor, Dock, etc.
    AssetTag NVARCHAR(100) NOT NULL UNIQUE,
    SerialNumber NVARCHAR(100) NOT NULL UNIQUE,
    WarrantyExpiry NVARCHAR(50) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Available', -- Assigned, Available, Maintenance
    CONSTRAINT FK_ITAssets_Seats FOREIGN KEY (SeatId) REFERENCES Seats(Id) ON DELETE SET NULL
);

-- 6. Seat Requests Table (Approval Workflow Engine)
CREATE TABLE SeatRequests (
    Id NVARCHAR(50) PRIMARY KEY,
    EmployeeName NVARCHAR(150) NOT NULL,
    EmployeeEmail NVARCHAR(150) NOT NULL,
    Department NVARCHAR(100) NOT NULL,
    BuildingId NVARCHAR(50) NOT NULL,
    FloorId NVARCHAR(50) NOT NULL,
    Reason NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Escalated, Rejected
    RequestedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EscalatedToAdmin BIT NOT NULL DEFAULT 0
);

-- 7. Check-In Logs Table (QR Code / IoT Audit)
CREATE TABLE CheckInLogs (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeName NVARCHAR(150) NOT NULL,
    SeatNumber NVARCHAR(50) NOT NULL,
    BuildingName NVARCHAR(150) NOT NULL,
    FloorName NVARCHAR(100) NOT NULL,
    CheckInTime DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CheckOutTime DATETIME2 NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Checked In' -- Checked In, Checked Out
);

-- =========================================================
-- INDEXING STRATEGIES FOR HIGH DENSITY QUERIES (20,000+ EMPLOYEES)
-- =========================================================
CREATE INDEX IX_Seats_Status ON Seats(Status);
CREATE INDEX IX_Seats_EmployeeEmail ON Seats(EmployeeEmail);
CREATE INDEX IX_Seats_ZoneId ON Seats(ZoneId);
CREATE UNIQUE INDEX UX_Seats_Number_Floor ON Seats(SeatNumber, FloorId);
CREATE INDEX IX_CheckInLogs_CheckInTime ON CheckInLogs(CheckInTime);

GO

-- =========================================================
-- STORED PROCEDURE: ATOMIC QR CHECK-IN TRANSACTION
-- =========================================================
CREATE PROCEDURE usp_AtomicDeskCheckIn
    @SeatId NVARCHAR(50),
    @EmployeeName NVARCHAR(150),
    @EmployeeEmail NVARCHAR(150),
    @Department NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Check if seat is currently claimed
        IF EXISTS (SELECT 1 FROM Seats WHERE Id = @SeatId AND Status = 'Occupied' AND EmployeeEmail <> @EmployeeEmail)
        BEGIN
            THROW 51000, 'Desk already claimed by another active session.', 1;
        END

        -- Set seat state to occupied
        UPDATE Seats 
        SET Status = 'Occupied',
            EmployeeId = 'emp-' + LEFT(CAST(NEWID() AS VARCHAR(50)), 8),
            EmployeeName = @EmployeeName,
            EmployeeEmail = @EmployeeEmail,
            Department = @Department
        WHERE Id = @SeatId;

        -- Log audit track
        INSERT INTO CheckInLogs (EmployeeName, SeatNumber, BuildingName, FloorName, CheckInTime, Status)
        SELECT @EmployeeName, S.SeatNumber, B.Name, F.Name, GETUTCDATE(), 'Checked In'
        FROM Seats S
        INNER JOIN Buildings B ON S.BuildingId = B.Id
        INNER JOIN Floors F ON S.FloorId = F.Id
        WHERE S.Id = @SeatId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
`;

  const efModels = `// =========================================================
// ENTITY FRAMEWORK CORE 9.0 COMPLIANT MODELS
// PATH: /Server/Infrastructure/CorporateDbContext.cs
// =========================================================

using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EnterpriseSeating.Infrastructure
{
    public class CorporateDbContext : DbContext
    {
        public CorporateDbContext(DbContextOptions<CorporateDbContext> options) : base(options) { }

        public DbSet<Building> Buildings { get; set; }
        public DbSet<Floor> Floors { get; set; }
        public DbSet<Zone> Zones { get; set; }
        public DbSet<Seat> Seats { get; set; }
        public DbSet<ITAsset> ITAssets { get; set; }
        public DbSet<SeatRequest> SeatRequests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Seat>()
                .HasIndex(s => s.Status);

            modelBuilder.Entity<Seat>()
                .HasIndex(s => s.EmployeeEmail);

            modelBuilder.Entity<ITAsset>()
                .HasIndex(a => a.AssetTag)
                .IsUnique();
        }
    }

    [Table("Buildings")]
    public class Building
    {
        [Key]
        public string Id { get; set; }
        [Required, MaxLength(150)]
        public string Name { get; set; }
        [Required, MaxLength(150)]
        public string Location { get; set; }
        public int FloorsCount { get; set; }
        public ICollection<Floor> Floors { get; set; }
    }

    [Table("Floors")]
    public class Floor
    {
        [Key]
        public string Id { get; set; }
        [ForeignKey("Building")]
        public string BuildingId { get; set; }
        public Building Building { get; set; }
        [Required, MaxLength(100)]
        public string Name { get; set; }
        public int Capacity { get; set; }
        public int ZonesCount { get; set; }
        public ICollection<Zone> Zones { get; set; }
    }

    [Table("Zones")]
    public class Zone
    {
        [Key]
        public string Id { get; set; }
        [ForeignKey("Floor")]
        public string FloorId { get; set; }
        public Floor Floor { get; set; }
        [Required, MaxLength(100)]
        public string Name { get; set; }
        [Required, MaxLength(100)]
        public string Department { get; set; }
        [Required, MaxLength(20)]
        public string Color { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public int Capacity { get; set; }
    }

    [Table("Seats")]
    public class Seat
    {
        [Key]
        public string Id { get; set; }
        [Required, MaxLength(50)]
        public string SeatNumber { get; set; }
        [ForeignKey("Zone")]
        public string ZoneId { get; set; }
        public Zone Zone { get; set; }
        public string FloorId { get; set; }
        public string BuildingId { get; set; }
        [Required]
        public string Type { get; set; } // Standard, Hot Desk, Executive, Collaborative
        [Required]
        public string Status { get; set; } = "Vacant";
        public string EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public string EmployeeEmail { get; set; }
        public string Department { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public int Rotation { get; set; } = 0;
        public ICollection<ITAsset> Assets { get; set; }
    }

    [Table("ITAssets")]
    public class ITAsset
    {
        [Key]
        public string Id { get; set; }
        [ForeignKey("Seat")]
        public string SeatId { get; set; }
        public Seat Seat { get; set; }
        [Required]
        public string Type { get; set; }
        [Required, MaxLength(100)]
        public string AssetTag { get; set; }
        [Required, MaxLength(100)]
        public string SerialNumber { get; set; }
        [Required]
        public string WarrantyExpiry { get; set; }
        [Required]
        public string Status { get; set; } = "Available";
    }
}
`;

  const dockerConfigs = `# =========================================================
# PRODUCTION DOCKERFILE FOR ENTERPRISE FULLSTACK LAYER
# COMPLIES WITH SECURITY HARDENING AND COLD-START OPTIMIZATION
# =========================================================

# --- STAGE 1: Build React & TypeScript SPA ---
FROM node:18-alpine AS spa-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- STAGE 2: Build ASP.NET Core Web API ---
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS dotnet-builder
WORKDIR /src
COPY Server/*.csproj ./
RUN dotnet restore
COPY Server/ .
RUN dotnet publish -c Release -o /app/out

# --- STAGE 3: Final Secure Production Runner ---
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runner
WORKDIR /app
RUN apk add --no-cache icu-libs
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# Create non-root system user for security compliance
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=dotnet-builder /app/out .
COPY --from=spa-builder /app/dist ./wwwroot

EXPOSE 3000
ENV PORT=3000
ENV ASPNETCORE_URLS=http://0.0.0.0:3000

ENTRYPOINT ["dotnet", "EnterpriseSeating.Web.dll"]
`;

  const cicdWorkflow = `# =========================================================
# GITHUB ACTIONS: enterprise-ci-cd-delivery.yml
# SECURE AUTO-PROVISIONING pipeline FOR AZURE & CLOUD CONTAINER RUN
# =========================================================

name: Enterprise Seating CI/CD

on:
  push:
    branches: [ "main", "release/*" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-validate:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Set up .NET Core SDK 9.0
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '9.0.x'

    - name: Setup Node.js v18
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'

    - name: Restore & Build ASP.NET Solution
      run: |
        dotnet restore Server/EnterpriseSeating.sln
        dotnet build Server/EnterpriseSeating.sln --configuration Release --no-restore

    - name: Run Backend Unit Tests
      run: dotnet test Server/Tests/EnterpriseSeating.Tests.csproj --configuration Release --no-build --logger "trx;LogFileName=test_results.trx"

    - name: Install Frontend Dependencies & Lint
      run: |
        npm ci
        npm run lint

    - name: Compile Frontend Assets
      run: npm run build

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Build Docker Container
      uses: docker/build-push-action@v5
      with:
        context: .
        push: false
        tags: enterprise-seating-core:latest
        cache-from: type=gha
        cache-to: type=gha,mode=max
`;

  const testSuites = `// =========================================================
// UNIT TESTS: SeatAllocationWorkflowTests.cs
// TESTING ROLE ELEVATION AND CAPACITY RESTRICTION POLICIES
// =========================================================

using Xunit;
using Moq;
using EnterpriseSeating.Core.Entities;
using EnterpriseSeating.Core.Services;

namespace EnterpriseSeating.Tests
{
    public class SeatAllocationWorkflowTests
    {
        private readonly Mock<ISeatRepository> _mockSeatRepo;
        private readonly Mock<IZoneRepository> _mockZoneRepo;
        private readonly Mock<IRequestRepository> _mockRequestRepo;
        private readonly AllocationWorkflowService _service;

        public SeatAllocationWorkflowTests()
        {
            _mockSeatRepo = new Mock<ISeatRepository>();
            _mockZoneRepo = new Mock<IZoneRepository>();
            _mockRequestRepo = new Mock<IRequestRepository>();

            _service = new AllocationWorkflowService(
                _mockSeatRepo.Object,
                _mockZoneRepo.Object,
                _mockRequestRepo.Object
            );
        }

        [Fact]
        public async Task ProcessApproval_ShouldAllocateSeat_WhenCapacityIsAvailable()
        {
            // Arrange: Setup mock vacancy structures
            var request = new SeatRequest { Id = "req-1", Department = "Engineering", Status = "Pending" };
            var vacantSeat = new Seat { Id = "s-101", Status = "Vacant", ZoneId = "z-1" };
            
            _mockSeatRepo.Setup(r => r.GetVacantSeatInDepartmentAsync("Engineering"))
                .ReturnsAsync(vacantSeat);

            // Act: Process Allocation
            var result = await _service.ProcessRequestApprovalAsync(request, "Sarah Connor");

            // Assert: Confirm seat flipped to claimed status
            Assert.True(result.Success);
            Assert.Equal("Approved", request.Status);
            _mockSeatRepo.Verify(r => r.UpdateSeatStatusAsync("s-101", "Occupied", "Sarah Connor"), Times.Once);
        }

        [Fact]
        public async Task ProcessApproval_ShouldAutoEscalateToAdmin_WhenNoVacancyExists()
        {
            // Arrange: Setup zero-vacancy condition
            var request = new SeatRequest { Id = "req-curie", Department = "Engineering", Status = "Pending" };
            
            _mockSeatRepo.Setup(r => r.GetVacantSeatInDepartmentAsync("Engineering"))
                .ReturnsAsync((Seat)null);

            // Act: Process Allocation
            var result = await _service.ProcessRequestApprovalAsync(request, "Marie Curie");

            // Assert: Confirm escalation status flipped automatically
            Assert.False(result.Success);
            Assert.Equal("Escalated", request.Status);
            Assert.True(request.EscalatedToAdmin);
        }
    }
}
`;

  const getCodeString = () => {
    switch(activeTab) {
      case "sql": return sqlScripts;
      case "ef": return efModels;
      case "docker": return dockerConfigs;
      case "cicd": return cicdWorkflow;
      case "tests": return testSuites;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="developer-module">
      {/* LEFT NAVIGATION LINKS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="developer-tabs">
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
            <Terminal className="text-blue-600 animate-pulse" size={17} />
            <span>Enterprise Blueprints</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">Production-ready database DDL, ORM mappings, CI/CD pipes, & container models</p>
        </div>

        <div className="space-y-1.5" id="developer-links">
          <button 
            onClick={() => { setActiveTab("sql"); setCopied(false); }}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all ${
              activeTab === "sql" ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <Database size={14} />
              <span>MSSQL & Azure SQL DDL</span>
            </span>
            <span className="text-[9px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">SQL</span>
          </button>

          <button 
            onClick={() => { setActiveTab("ef"); setCopied(false); }}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all ${
              activeTab === "ef" ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileCode size={14} />
              <span>EF Core 9 Entity Models</span>
            </span>
            <span className="text-[9px] bg-purple-100 px-1.5 py-0.5 rounded text-purple-700">C#</span>
          </button>

          <button 
            onClick={() => { setActiveTab("docker"); setCopied(false); }}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all ${
              activeTab === "docker" ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings size={14} />
              <span>Dockerfile & Containerization</span>
            </span>
            <span className="text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">Docker</span>
          </button>

          <button 
            onClick={() => { setActiveTab("cicd"); setCopied(false); }}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all ${
              activeTab === "cicd" ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity size={14} />
              <span>CI/CD Automation Pipeline</span>
            </span>
            <span className="text-[9px] bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-700">YAML</span>
          </button>

          <button 
            onClick={() => { setActiveTab("tests"); setCopied(false); }}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all ${
              activeTab === "tests" ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={14} />
              <span>Unit Testing Framework</span>
            </span>
            <span className="text-[9px] bg-pink-100 px-1.5 py-0.5 rounded text-pink-700">Tests</span>
          </button>
        </div>
      </div>

      {/* CODE VIEW CANVAS */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 lg:col-span-3 p-5 flex flex-col justify-between min-h-[440px] shadow-lg relative" id="developer-code-view">
        <div className="flex justify-between items-center pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FolderOpen className="text-slate-500" size={15} />
            <span className="text-xs font-mono font-bold text-slate-300">
              {activeTab === "sql" && "src/database/schema_mssql.sql"}
              {activeTab === "ef" && "src/infrastructure/CorporateDbContext.cs"}
              {activeTab === "docker" && "src/containers/Dockerfile.prod"}
              {activeTab === "cicd" && ".github/workflows/delivery_pipeline.yml"}
              {activeTab === "tests" && "src/tests/AllocationWorkflowTests.cs"}
            </span>
          </div>

          <button 
            onClick={() => handleCopy(getCodeString())}
            className="text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg font-mono font-medium flex items-center gap-1.5 transition-colors"
          >
            <Copy size={13} />
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>

        {/* Code Content display */}
        <pre className="flex-1 w-full bg-slate-950 p-4 rounded-xl text-slate-200 text-[10px] font-mono leading-relaxed overflow-auto max-h-[380px] mt-4 select-text" id="raw-code-print">
          <code>{getCodeString()}</code>
        </pre>
      </div>
    </div>
  );
}
