import ClaimCard from "../components/ClaimCard";
import { allClaims } from "../data/mockData";

function ClaimsPage() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        My Claims
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {allClaims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  );
}

export default ClaimsPage;
