-- Allow candidates (and their uploaded documents) to be saved either against a specific requisition
-- or into the general pipeline when requisition_id is omitted, and persist department/location metadata.
ALTER TABLE candidates
    MODIFY COLUMN requisition_id BIGINT NULL,
    ADD COLUMN department_name VARCHAR(150) NULL AFTER requisition_id,
    ADD COLUMN location VARCHAR(150) NULL AFTER department_name;

ALTER TABLE candidate_documents
    MODIFY COLUMN requisition_id BIGINT NULL;

