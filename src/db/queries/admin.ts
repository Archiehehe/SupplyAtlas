import { db } from "../client";
import { candidateEdges } from "../schema";
import { eq } from "drizzle-orm";

export async function createCandidateEdge(data: {
  sourceLabel: string;
  targetLabel: string;
  relationshipType: string;
  confidenceScore: string;
  evidenceQuote?: string;
  sourceDocumentId?: string;
  extractionMethod?: string;
}) {
  const [edge] = await db.insert(candidateEdges).values(data).returning();
  return edge;
}

export async function approveCandidateEdge(
  candidateEdgeId: string,
  reviewedBy: string
) {
  const [edge] = await db
    .update(candidateEdges)
    .set({
      reviewStatus: "approved",
      reviewedBy,
      reviewedAt: new Date(),
    })
    .where(eq(candidateEdges.id, candidateEdgeId))
    .returning();
  return edge;
}

export async function rejectCandidateEdge(
  candidateEdgeId: string,
  reviewedBy: string,
  reviewNotes?: string
) {
  const [edge] = await db
    .update(candidateEdges)
    .set({
      reviewStatus: "rejected",
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes,
    })
    .where(eq(candidateEdges.id, candidateEdgeId))
    .returning();
  return edge;
}
