import React, { useState } from "react";
import logo from "../assets/logo.png";
import Search from "./Search";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaRegUserCircle } from "react-icons/fa";
import userMobile from "../hooks/useMobile";
import { BsCart4 } from "react-icons/bs";
import { Toaster } from "react-hot-toast";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import { useSelector } from "react-redux";
import UserProfile from "./UserProfile";
import UserProfileMobile from "./UserProfileMobile";

const Header = () => {
  const user = useSelector((state) => state.userDetails);

  const [isMobile] = userMobile();

  const location = useLocation();

  const navigate = useNavigate();

  const [openProfile, setOpenProfile] = useState(false);

  const handleUserClick = () => {
    setOpenProfile((prev) => !prev);
  };
  const redirectToLoginPage = () => {
    navigate("/login");
  };

  const [profile, setProfile] = useState(false);

  const isSearchPage = location.pathname === "/search";

  return (
    <header className="container pt-2 lg:pt-0 px-5 mx-auto h-[7rem] lg:h-[5.5rem] sticky top-0 lg:shadow-lg bg-white">
      <div className="container mx-auto ">
        <div className="flex items-center lg:p-5 justify-between  ">
          {/* logo section */}
          <Link
            to={"/"}
            className={`flex justify-center flex-col px-2 ${
              isMobile && isSearchPage && "hidden"
            }`}
          >
            <img src={logo} height={60} width={170} alt="logo" />
          </Link>

          {/* search section  */}
          <div className="cursor-text hidden lg:block">
            <Search />
          </div>

          {/* User icon for mobile version */}

          <div
            onClick={handleUserClick}
            className={`lg:hidden text-2xl px-3 ${
              isMobile && isSearchPage && "hidden"
            }`}
          >
            {user.avatar ? (
              <div className="w-8  ">
                <img src={`${user?.avatar}`} alt="" className="rounded-full " />
              </div>
            ) : (
              <FaRegUserCircle size={30} />
            )}
            {openProfile && <UserProfileMobile setProfile={setProfile} />}
          </div>

          {/* login and cart section for desktop version */}
          <Toaster />
          <div className="hidden lg:flex  lg:items-center lg:gap-9">
            <div>
              {user._id ? (
                <div className="relative">
                  <div
                    className="flex items-center gap-1 select-none cursor-pointer"
                    onClick={() => setProfile((prev) => !prev)}
                  >
                    <p>Account</p>
                    {profile ? (
                      <IoMdArrowDropup size={25} />
                    ) : (
                      <IoMdArrowDropdown size={25} />
                    )}
                  </div>
                  <div className="min-w-64 right-0 absolute top-[3.2rem] bg-white shadow-lg  rounded-lg">
                    {profile && <UserProfile setProfile={setProfile} />}
                  </div>
                </div>
              ) : (
                <button onClick={redirectToLoginPage} className="font-semibold">
                  Login
                </button>
              )}
            </div>
            <button className="flex items-center bg-green-800 py-3 px-4 rounded-md text-white gap-2 hover:bg-green-700">
              <div className="animate-bounce">
                <BsCart4 size={29} />
              </div>
              <div className="font-semibold">
                <span>My cart</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      <div className="mx-auto container bg-transparent pt-2 px-4 lg:hidden">
        <Search />
      </div>
    </header>
  );
};

export default Header;
